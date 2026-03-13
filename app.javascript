const modeButtons = document.querySelectorAll(".mode-btn");
const cidrPanel = document.getElementById("cidr-panel");
const maskPanel = document.getElementById("mask-panel");

const cidrInput = document.getElementById("cidr");
const ipInput = document.getElementById("ip");
const maskInput = document.getElementById("mask");

const calcBtn = document.getElementById("calcBtn");
const clearBtn = document.getElementById("clearBtn");
const message = document.getElementById("message");
const result = document.getElementById("result");

const subnetMaskEl = document.getElementById("subnetMask");
const networkNameEl = document.getElementById("networkName");
const broadcastEl = document.getElementById("broadcast");
const ipRangeEl = document.getElementById("ipRange");
const usableRangeEl = document.getElementById("usableRange");
const hostCountEl = document.getElementById("hostCount");

let currentMode = "cidr";

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    modeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;

    if (currentMode === "cidr") {
      cidrPanel.classList.remove("hidden");
      maskPanel.classList.add("hidden");
    } else {
      cidrPanel.classList.add("hidden");
      maskPanel.classList.remove("hidden");
    }

    clearResult();
  });
});

calcBtn.addEventListener("click", () => {
  try {
    message.textContent = "";

    let ip = "";
    let prefix = 0;

    if (currentMode === "cidr") {
      const parsed = parseCIDR(cidrInput.value.trim());
      ip = parsed.ip;
      prefix = parsed.prefix;
    } else {
      ip = ipInput.value.trim();
      const mask = maskInput.value.trim();

      validateIP(ip);
      validateMask(mask);

      prefix = maskToPrefix(mask);
    }

    const data = calculateSubnetInfo(ip, prefix);
    renderResult(data);
  } catch (err) {
    result.classList.add("hidden");
    message.textContent = err.message;
  }
});

clearBtn.addEventListener("click", () => {
  cidrInput.value = "";
  ipInput.value = "";
  maskInput.value = "";
  clearResult();
});

cidrInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") calcBtn.click();
});

ipInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") calcBtn.click();
});

maskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") calcBtn.click();
});

function clearResult() {
  message.textContent = "";
  result.classList.add("hidden");

  subnetMaskEl.textContent = "-";
  networkNameEl.textContent = "-";
  broadcastEl.textContent = "-";
  ipRangeEl.textContent = "-";
  usableRangeEl.textContent = "-";
  hostCountEl.textContent = "-";
}

function parseCIDR(value) {
  if (!value.includes("/")) {
    throw new Error("請輸入正確格式，例如：192.168.1.10/24");
  }

  const parts = value.split("/");
  if (parts.length !== 2) {
    throw new Error("CIDR 格式錯誤。");
  }

  const ip = parts[0].trim();
  const prefixText = parts[1].trim();

  validateIP(ip);

  if (!/^\d+$/.test(prefixText)) {
    throw new Error("首碼必須是 0 到 32 的整數。");
  }

  const prefix = Number(prefixText);
  if (prefix < 0 || prefix > 32) {
    throw new Error("首碼必須介於 0 到 32。");
  }

  return { ip, prefix };
}

function validateIP(ip) {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    throw new Error("IP 格式錯誤。");
  }

  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      throw new Error("IP 必須為數字格式。");
    }

    const num = Number(part);
    if (num < 0 || num > 255) {
      throw new Error("IP 每段必須介於 0 到 255。");
    }
  }
}

function validateMask(mask) {
  validateIP(mask);

  const maskInt = ipToInt(mask);
  const bin = toBinary32(maskInt);

  if (!/^1*0*$/.test(bin)) {
    throw new Error("子網路遮罩不合法。");
  }
}

function ipToInt(ip) {
  const parts = ip.split(".").map(Number);
  return (
    (((parts[0] << 24) >>> 0) |
      ((parts[1] << 16) >>> 0) |
      ((parts[2] << 8) >>> 0) |
      (parts[3] >>> 0)) >>> 0
  );
}

function intToIP(intValue) {
  return [
    (intValue >>> 24) & 255,
    (intValue >>> 16) & 255,
    (intValue >>> 8) & 255,
    intValue & 255
  ].join(".");
}

function toBinary32(num) {
  return (num >>> 0).toString(2).padStart(32, "0");
}

function prefixToMask(prefix) {
  if (prefix === 0) return "0.0.0.0";
  const maskInt = (0xffffffff << (32 - prefix)) >>> 0;
  return intToIP(maskInt);
}

function maskToPrefix(mask) {
  const bin = toBinary32(ipToInt(mask));
  const firstZero = bin.indexOf("0");
  return firstZero === -1 ? 32 : firstZero;
}

function calculateSubnetInfo(ip, prefix) {
  const ipInt = ipToInt(ip);

  let maskInt = 0;
  if (prefix > 0) {
    maskInt = (0xffffffff << (32 - prefix)) >>> 0;
  }

  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | (~maskInt >>> 0)) >>> 0;

  let usableStart = "";
  let usableEnd = "";
  let hostCount = 0;

  if (prefix === 32) {
    usableStart = intToIP(networkInt);
    usableEnd = intToIP(networkInt);
    hostCount = 1;
  } else if (prefix === 31) {
    usableStart = intToIP(networkInt);
    usableEnd = intToIP(broadcastInt);
    hostCount = 2;
  } else if (prefix === 0) {
    usableStart = "0.0.0.1";
    usableEnd = "255.255.255.254";
    hostCount = 4294967294;
  } else {
    usableStart = intToIP((networkInt + 1) >>> 0);
    usableEnd = intToIP((broadcastInt - 1) >>> 0);
    hostCount = broadcastInt - networkInt - 1;
  }

  return {
    subnetMask: prefixToMask(prefix),
    networkName: `${intToIP(networkInt)}/${prefix}`,
    broadcast: intToIP(broadcastInt),
    ipRange: `${intToIP(networkInt)} ~ ${intToIP(broadcastInt)}`,
    usableRange: `${usableStart} ~ ${usableEnd}`,
    hostCount: hostCount.toLocaleString()
  };
}

function renderResult(data) {
  subnetMaskEl.textContent = data.subnetMask;
  networkNameEl.textContent = data.networkName;
  broadcastEl.textContent = data.broadcast;
  ipRangeEl.textContent = data.ipRange;
  usableRangeEl.textContent = data.usableRange;
  hostCountEl.textContent = data.hostCount;

  result.classList.remove("hidden");
}
