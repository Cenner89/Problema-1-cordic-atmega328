const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT, "CliBuild");
const HEX_FILE = path.join(BUILD_DIR, "Problema1.hex");
const BUILD_SCRIPT = path.join(__dirname, "build.ps1");

const SREG = {
  C: 0,
  Z: 1,
  N: 2,
  V: 3,
  S: 4,
  H: 5,
};

function main() {
  runBuild();
  const flash = parseIntelHex(HEX_FILE);
  const cpu = new AvrCpu(flash);
  cpu.run();

  const checks = [
    ["sin/cos 0 graus", 0x0120, [0xff, 0x3f, 0x04, 0x00, 0xff, 0xff, 0x0f]],
    ["sin/cos 30 graus", 0x0128, [0x6f, 0x37, 0xff, 0x1f, 0x00, 0x00, 0x0f]],
    ["sin/cos 45 graus", 0x0130, [0x42, 0x2d, 0x41, 0x2d, 0xff, 0xff, 0x0f]],
    ["sin/cos 60 graus", 0x0138, [0xff, 0x1f, 0x6f, 0x37, 0x00, 0x00, 0x0f]],
    ["sin/cos 90 graus", 0x0140, [0x04, 0x00, 0xff, 0x3f, 0xff, 0xff, 0x0f]],
    ["polar r=0,5 ang=45", 0x0148, [0xa1, 0x16, 0xa0, 0x16]],
    ["polar r=1,0 ang=0", 0x0150, [0xff, 0x3f, 0x04, 0x00]],
    ["polar r=1,0 ang=90", 0x0154, [0x04, 0x00, 0xff, 0x3f]],
    ["polar r=0,5 ang=30", 0x0158, [0xb7, 0x1b, 0xff, 0x0f]],
    ["polar r=0,5 ang=60", 0x015c, [0xff, 0x0f, 0xb7, 0x1b]],
  ];

  let failures = 0;
  for (const [name, address, expected] of checks) {
    const actual = Array.from(cpu.sram.slice(address, address + expected.length));
    const ok = sameBytes(actual, expected);
    if (ok) {
      console.log(`PASS ${name} @ ${hex(address, 4)} = ${formatBytes(actual)}`);
    } else {
      failures += 1;
      console.error(`FAIL ${name} @ ${hex(address, 4)}`);
      console.error(`  esperado: ${formatBytes(expected)}`);
      console.error(`  obtido:   ${formatBytes(actual)}`);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`PASS todos os testes CORDIC (${checks.length} verificacoes)`);
}

function runBuild() {
  execFileSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", BUILD_SCRIPT],
    { cwd: ROOT, stdio: "inherit" },
  );
}

function parseIntelHex(filePath) {
  const flash = new Uint8Array(64 * 1024);
  let upper = 0;
  const lines = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);

  for (const line of lines) {
    if (!line.startsWith(":")) {
      throw new Error(`Linha HEX invalida: ${line}`);
    }

    const length = parseInt(line.slice(1, 3), 16);
    const address = parseInt(line.slice(3, 7), 16);
    const type = parseInt(line.slice(7, 9), 16);
    const data = [];

    for (let i = 0; i < length; i += 1) {
      data.push(parseInt(line.slice(9 + i * 2, 11 + i * 2), 16));
    }

    if (type === 0x00) {
      const base = upper + address;
      for (let i = 0; i < data.length; i += 1) {
        flash[base + i] = data[i];
      }
    } else if (type === 0x01) {
      break;
    } else if (type === 0x02) {
      upper = ((data[0] << 8) | data[1]) << 4;
    } else if (type === 0x04) {
      upper = ((data[0] << 8) | data[1]) << 16;
    } else {
      throw new Error(`Tipo HEX nao suportado: ${type}`);
    }
  }

  return flash;
}

class AvrCpu {
  constructor(flash) {
    this.flash = flash;
    this.sram = new Uint8Array(0x1000);
    this.r = new Uint8Array(32);
    this.pc = 0;
    this.sreg = 0;
    this.sp = 0x08ff;
    this.cycles = 0;
  }

  run(maxCycles = 1_000_000) {
    while (this.cycles < maxCycles) {
      const op = this.fetchWord(this.pc);
      if (isRjmpSelf(op)) {
        return;
      }
      this.step();
      this.cycles += 1;
    }
    throw new Error(`Simulacao excedeu ${maxCycles} instrucoes`);
  }

  step() {
    const pc0 = this.pc;
    const op = this.fetchWord(pc0);

    if ((op & 0xf000) === 0xc000) return this.execRjmp(op);
    if ((op & 0xf000) === 0xd000) return this.execRcall(op);
    if (op === 0x9508) return this.execRet();
    if ((op & 0xf000) === 0xe000) return this.execLdi(op);
    if ((op & 0xfe0f) === 0x9200) return this.execSts(op);
    if ((op & 0xfe0f) === 0x9000) return this.execLds(op);
    if ((op & 0xf800) === 0xb800) return this.execOut(op);
    if ((op & 0xfe0f) === 0x9005) return this.execLpmPostInc(op);
    if ((op & 0xfc00) === 0x2c00) return this.execMov(op);
    if ((op & 0xfc00) === 0x2400) return this.execEor(op);
    if ((op & 0xfc00) === 0x2000) return this.execAnd(op);
    if ((op & 0xfc00) === 0x0c00) return this.execAdd(op, 0);
    if ((op & 0xfc00) === 0x1c00) return this.execAdd(op, this.getFlag(SREG.C));
    if ((op & 0xfc00) === 0x1800) return this.execSub(op, 0, true);
    if ((op & 0xfc00) === 0x0800) return this.execSub(op, this.getFlag(SREG.C), true);
    if ((op & 0xfe08) === 0xfc00) return this.execSkipBit(op, true);
    if ((op & 0xfe08) === 0xfe00) return this.execSkipBit(op, false);
    if ((op & 0xfc00) === 0xf000) return this.execBranch(op, true);
    if ((op & 0xfc00) === 0xf400) return this.execBranch(op, false);
    if ((op & 0xf000) === 0x3000) return this.execCpi(op);
    if ((op & 0xf000) === 0x5000) return this.execSubi(op, false);
    if ((op & 0xf000) === 0x4000) return this.execSubi(op, true);
    if ((op & 0xfe0f) === 0x9403) return this.execInc(op);
    if ((op & 0xfe0f) === 0x940a) return this.execDec(op);
    if ((op & 0xfe0f) === 0x9400) return this.execCom(op);
    if ((op & 0xfe0f) === 0x9405) return this.execAsr(op);
    if ((op & 0xfe0f) === 0x9406) return this.execLsr(op);
    if ((op & 0xfe0f) === 0x9407) return this.execRor(op);

    throw new Error(`Opcode nao suportado ${hex(op, 4)} em PC=${hex(pc0, 4)}`);
  }

  fetchWord(wordAddress) {
    const byteAddress = wordAddress * 2;
    return this.flash[byteAddress] | (this.flash[byteAddress + 1] << 8);
  }

  execRjmp(op) {
    this.pc = this.pc + 1 + signExtend(op & 0x0fff, 12);
  }

  execRcall(op) {
    const ret = this.pc + 1;
    this.push16(ret);
    this.pc = ret + signExtend(op & 0x0fff, 12);
  }

  execRet() {
    this.pc = this.pop16();
  }

  execLdi(op) {
    const d = 16 + ((op >> 4) & 0x0f);
    const k = (op & 0x0f) | ((op >> 4) & 0xf0);
    this.r[d] = k;
    this.pc += 1;
  }

  execSts(op) {
    const d = (op >> 4) & 0x1f;
    const address = this.fetchWord(this.pc + 1);
    this.writeData(address, this.r[d]);
    this.pc += 2;
  }

  execLds(op) {
    const d = (op >> 4) & 0x1f;
    const address = this.fetchWord(this.pc + 1);
    this.r[d] = this.readData(address);
    this.pc += 2;
  }

  execOut(op) {
    const a = (op & 0x0f) | ((op >> 5) & 0x30);
    const r = (op >> 4) & 0x1f;
    if (a === 0x3d) this.sp = (this.sp & 0xff00) | this.r[r];
    if (a === 0x3e) this.sp = (this.sp & 0x00ff) | (this.r[r] << 8);
    this.pc += 1;
  }

  execLpmPostInc(op) {
    const d = (op >> 4) & 0x1f;
    const z = this.getReg16(30);
    this.r[d] = this.flash[z];
    this.setReg16(30, (z + 1) & 0xffff);
    this.pc += 1;
  }

  execMov(op) {
    const [d, r] = decodeRdRr(op);
    this.r[d] = this.r[r];
    this.pc += 1;
  }

  execEor(op) {
    const [d, r] = decodeRdRr(op);
    this.r[d] = this.r[d] ^ this.r[r];
    this.updateLogicFlags(this.r[d]);
    this.pc += 1;
  }

  execAnd(op) {
    const [d, r] = decodeRdRr(op);
    this.r[d] = this.r[d] & this.r[r];
    this.updateLogicFlags(this.r[d]);
    this.pc += 1;
  }

  execAdd(op, carryIn) {
    const [d, r] = decodeRdRr(op);
    const a = this.r[d];
    const b = this.r[r];
    const result = a + b + carryIn;
    const value = result & 0xff;
    this.r[d] = value;
    this.updateAddFlags(a, b, value, result > 0xff);
    this.pc += 1;
  }

  execSub(op, carryIn, writeResult) {
    const [d, r] = decodeRdRr(op);
    const a = this.r[d];
    const b = this.r[r];
    const result = a - b - carryIn;
    const value = result & 0xff;
    if (writeResult) this.r[d] = value;
    this.updateSubFlags(a, b, value, result < 0, carryIn);
    this.pc += 1;
  }

  execSkipBit(op, skipIfClear) {
    const r = (op >> 4) & 0x1f;
    const bit = op & 0x07;
    const isSet = ((this.r[r] >> bit) & 1) === 1;
    const shouldSkip = skipIfClear ? !isSet : isSet;
    if (!shouldSkip) {
      this.pc += 1;
      return;
    }
    const next = this.fetchWord(this.pc + 1);
    this.pc += 1 + instructionWords(next);
  }

  execBranch(op, branchIfSet) {
    const bit = op & 0x07;
    const offset = signExtend((op >> 3) & 0x7f, 7);
    const isSet = this.getFlag(bit) === 1;
    this.pc += branchIfSet === isSet ? 1 + offset : 1;
  }

  execCpi(op) {
    const d = 16 + ((op >> 4) & 0x0f);
    const k = (op & 0x0f) | ((op >> 4) & 0xf0);
    const a = this.r[d];
    const result = a - k;
    this.updateSubFlags(a, k, result & 0xff, result < 0, 0);
    this.pc += 1;
  }

  execSubi(op, withCarry) {
    const d = 16 + ((op >> 4) & 0x0f);
    const k = (op & 0x0f) | ((op >> 4) & 0xf0);
    const carryIn = withCarry ? this.getFlag(SREG.C) : 0;
    const a = this.r[d];
    const result = a - k - carryIn;
    const value = result & 0xff;
    this.r[d] = value;
    this.updateSubFlags(a, k, value, result < 0, carryIn);
    this.pc += 1;
  }

  execInc(op) {
    const d = (op >> 4) & 0x1f;
    const value = (this.r[d] + 1) & 0xff;
    this.r[d] = value;
    this.setFlag(SREG.V, value === 0x80);
    this.setNzS(value);
    this.pc += 1;
  }

  execDec(op) {
    const d = (op >> 4) & 0x1f;
    const value = (this.r[d] - 1) & 0xff;
    this.r[d] = value;
    this.setFlag(SREG.V, value === 0x7f);
    this.setNzS(value);
    this.pc += 1;
  }

  execCom(op) {
    const d = (op >> 4) & 0x1f;
    const value = (~this.r[d]) & 0xff;
    this.r[d] = value;
    this.setFlag(SREG.C, true);
    this.setFlag(SREG.V, false);
    this.setNzS(value);
    this.pc += 1;
  }

  execAsr(op) {
    const d = (op >> 4) & 0x1f;
    const old = this.r[d];
    const value = (old & 0x80) | (old >> 1);
    this.r[d] = value;
    this.setFlag(SREG.C, (old & 1) !== 0);
    this.setNzvS(value);
    this.pc += 1;
  }

  execLsr(op) {
    const d = (op >> 4) & 0x1f;
    const old = this.r[d];
    const value = old >> 1;
    this.r[d] = value;
    this.setFlag(SREG.C, (old & 1) !== 0);
    this.setFlag(SREG.N, false);
    this.setFlag(SREG.Z, value === 0);
    this.setFlag(SREG.V, this.getFlag(SREG.N) ^ this.getFlag(SREG.C));
    this.setFlag(SREG.S, this.getFlag(SREG.N) ^ this.getFlag(SREG.V));
    this.pc += 1;
  }

  execRor(op) {
    const d = (op >> 4) & 0x1f;
    const old = this.r[d];
    const oldCarry = this.getFlag(SREG.C);
    const value = (old >> 1) | (oldCarry << 7);
    this.r[d] = value;
    this.setFlag(SREG.C, (old & 1) !== 0);
    this.setNzvS(value);
    this.pc += 1;
  }

  readData(address) {
    return this.sram[address] || 0;
  }

  writeData(address, value) {
    this.sram[address] = value & 0xff;
  }

  getReg16(index) {
    return this.r[index] | (this.r[index + 1] << 8);
  }

  setReg16(index, value) {
    this.r[index] = value & 0xff;
    this.r[index + 1] = (value >> 8) & 0xff;
  }

  push16(value) {
    this.sram[this.sp] = (value >> 8) & 0xff;
    this.sp = (this.sp - 1) & 0xffff;
    this.sram[this.sp] = value & 0xff;
    this.sp = (this.sp - 1) & 0xffff;
  }

  pop16() {
    this.sp = (this.sp + 1) & 0xffff;
    const low = this.sram[this.sp];
    this.sp = (this.sp + 1) & 0xffff;
    const high = this.sram[this.sp];
    return low | (high << 8);
  }

  getFlag(bit) {
    return (this.sreg >> bit) & 1;
  }

  setFlag(bit, enabled) {
    if (enabled) this.sreg |= 1 << bit;
    else this.sreg &= ~(1 << bit);
  }

  updateLogicFlags(value) {
    this.setFlag(SREG.V, false);
    this.setNzS(value);
  }

  updateAddFlags(a, b, value, carry) {
    this.setFlag(SREG.H, ((a & 0x0f) + (b & 0x0f)) > 0x0f);
    this.setFlag(SREG.V, (~(a ^ b) & (a ^ value) & 0x80) !== 0);
    this.setFlag(SREG.N, (value & 0x80) !== 0);
    this.setFlag(SREG.Z, value === 0);
    this.setFlag(SREG.C, carry);
    this.setFlag(SREG.S, this.getFlag(SREG.N) ^ this.getFlag(SREG.V));
  }

  updateSubFlags(a, b, value, carry, carryIn) {
    this.setFlag(SREG.H, ((~a & b) | (b & value) | (value & ~a) & 0x08) !== 0);
    this.setFlag(SREG.V, ((a ^ b) & (a ^ value) & 0x80) !== 0);
    this.setFlag(SREG.N, (value & 0x80) !== 0);
    if (carryIn) this.setFlag(SREG.Z, value === 0 && this.getFlag(SREG.Z));
    else this.setFlag(SREG.Z, value === 0);
    this.setFlag(SREG.C, carry);
    this.setFlag(SREG.S, this.getFlag(SREG.N) ^ this.getFlag(SREG.V));
  }

  setNzS(value) {
    this.setFlag(SREG.N, (value & 0x80) !== 0);
    this.setFlag(SREG.Z, value === 0);
    this.setFlag(SREG.S, this.getFlag(SREG.N) ^ this.getFlag(SREG.V));
  }

  setNzvS(value) {
    this.setFlag(SREG.N, (value & 0x80) !== 0);
    this.setFlag(SREG.Z, value === 0);
    this.setFlag(SREG.V, this.getFlag(SREG.N) ^ this.getFlag(SREG.C));
    this.setFlag(SREG.S, this.getFlag(SREG.N) ^ this.getFlag(SREG.V));
  }
}

function decodeRdRr(op) {
  const d = (op >> 4) & 0x1f;
  const r = (op & 0x0f) | ((op >> 5) & 0x10);
  return [d, r];
}

function instructionWords(op) {
  if ((op & 0xfe0f) === 0x9200) return 2; // STS
  if ((op & 0xfe0f) === 0x9000) return 2; // LDS
  return 1;
}

function isRjmpSelf(op) {
  return (op & 0xf000) === 0xc000 && signExtend(op & 0x0fff, 12) === -1;
}

function signExtend(value, bits) {
  const sign = 1 << (bits - 1);
  return (value & sign) ? value - (1 << bits) : value;
}

function sameBytes(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function formatBytes(bytes) {
  return bytes.map((value) => value.toString(16).toUpperCase().padStart(2, "0")).join(" ");
}

function hex(value, width) {
  return `0x${value.toString(16).toUpperCase().padStart(width, "0")}`;
}

main();
