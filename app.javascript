const tabs = document.querySelectorAll('.tab');
const cidrForm = document.getElementById('cidrForm');
const maskForm = document.getElementById('maskForm');
const calculateBtn = document.getElementById('calculateBtn');
const clearBtn = document.getElementById('clearBtn');
const errorEl = document.getElementById('error');
const resultEl = document.getElementById('result');

let currentMode = 'cidr';

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentMode = tab.dataset.mode;

    if (currentMode === 'cidr') {
      cidrForm.classList.remove('hidden');
      maskForm.classList.add('hidden');
    } else {
      cidrForm.classList.add('hidden');
      maskForm.classList.remove('hidden');
    }

    clearOutput();
  });
});

calculateBtn.addEventListener('click', () => {
  errorEl.textContent = '';

  try {
    let ip;
    let prefix;

    if (currentMode === 'cidr') {
      const cidrInput = document.getElementById('cidrInput').value.trim();
      ({ ip, prefix } = parseCIDR(cidrInput));
    } else {
      ip = document.getElementById('ipInput').value.trim();
      const mask = document.getElementById('maskInput').value.trim();
      validateIP(ip);
      validateMask(mask);
      prefix = maskToPrefix(mask);
    }

    const info = calculateSubnet(ip, prefix);
    renderResult(info);
  } catch (err) {
    resultEl.classList.add('hidden');
    errorEl.textContent = err.message;
  }
});

clearBtn.addEventListener('click', () => {
  document.getElementById('cidrInput').value = '';
  document.getElementById('ipInput').value = '';
  document.getElementById('maskInput').value = '';
  clearOutput();
});

function clearOutput() {
  errorEl.textContent = '';
  resultEl.classList.add('hidden');
}

function parseCIDR(input) {
  if (!input.includes('/')) {
    throw new Error('請輸入正確格式，例如：192.168.1.10/24');
  }

  const [ip, prefixText] = input.split('/');
  validateIP(ip);

  const prefix = Number(prefixText);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error('首碼必須是 0 到 32 的整數。');
  }

  return { ip, prefix };
}

function validateIP(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    throw new Error('IP 格式錯誤。');
  }

  parts.forEach(part => {
    if (!/^\d+$/.test(part)) {
      throw new Error('IP 必須只包含數字與點。');
    }
    const num = Number(part);
    if (num < 0 || num > 255) {
      throw new Error('IP 每個欄位都必須介於 0 到 255。');
    }
  });
}

function validateMask(mask) {
  validateIP(mask);
  const binary = ipToInt(mask).toString(2).padStart(32, '0');

  if (!/^1*0*$/.test(binary)) {
    throw new Error('子網路遮罩格式不正確。');
  }
}

function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) >>> 0) + Number(octet), 0) >>> 0;
}

function intToIP(num) {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255
  ].join('.');
}

function prefixToMask(prefix) {
  if (prefix === 0) return '0.0.0.0';
  const maskInt = (0xffffffff << (32 - prefix)) >>> 0;
  return intToIP(maskInt);
}

function maskToPrefix(mask) {
  const binary = ipToInt(mask).toString(2).padStart(32, '0');
  return binary.indexOf('0') === -1 ? 32 : binary.indexOf('0');
}

function calculateSubnet(ip, prefix) {
  const ipInt = ipToInt(ip);
  const maskInt = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  const networkInt = ipInt & maskInt;
  const broadcastInt = networkInt | (~maskInt >>> 0);

  let usableStart = '-';
  let usableEnd = '-';
  let hostCount = 0;

  if (prefix === 32) {
    usableStart = intToIP(networkInt);
    usableEnd = intToIP(networkInt);
    hostCount = 1;
  } else if (prefix === 31) {
    usableStart = intToIP(networkInt);
    usableEnd = intToIP(broadcastInt);
    hostCount = 2;
  } else {
    usableStart = intToIP(networkInt + 1);
    usableEnd = intToIP(broadcastInt - 1);
    hostCount = Math.max(0, broadcastInt - networkInt - 1);
  }

  return {
    mask: prefixToMask(prefix),
    network: `${intToIP(networkInt)}/${prefix}`,
    broadcast: intToIP(broadcastInt),
    range: `${intToIP(networkInt)} ～ ${intToIP(broadcastInt)}`,
    usable: `${usableStart} ～ ${usableEnd}`,
    hosts: hostCount.toLocaleString()
  };
}

function renderResult(info) {
  document.getElementById('outMask').textContent = info.mask;
  document.getElementById('outNetwork').textContent = info.network;
  document.getElementById('outBroadcast').textContent = info.broadcast;
  document.getElementById('outRange').textContent = info.range;
  document.getElementById('outUsable').textContent = info.usable;
  document.getElementById('outHosts').textContent = info.hosts;
  resultEl.classList.remove('hidden');
}
