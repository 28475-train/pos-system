//-----------------------------------------------------
// ここにあなたの GAS WebアプリURL を貼る
//-----------------------------------------------------
const API = "https://script.google.com/macros/s/AKfycbzT69TD2TOamh8glm4H5LERxyr-fu04ZN_cChIIGvrxlC0rLb22Eg1gHuGoYfaTusHA/exec";

//--------------------
// API通信関数
//--------------------
async function apiGet(q) {
  const r = await fetch(`${API}?${q}`);
  return r.json();
}

async function apiPost(action, data) {
  const r = await fetch(API, {
    method: "POST",
    body: JSON.stringify({ action, data })
  });
  return r.json();
}

//--------------------
// 商品ロード
//--------------------
async function loadProducts() {
  const r = await apiGet("action=products");
  const list = document.getElementById("productList");
  list.innerHTML = "";

  r.products.forEach(p => {
    const div = document.createElement("div");
    div.className = "item";
    div.textContent = `${p.name} - ${p.price}円`;
    div.onclick = () => addCart(p);
    list.appendChild(div);
  });
}

let cart = [];

//--------------------
// カート操作
//--------------------
function addCart(p) {
  cart.push(p);
  renderCart();
}

function renderCart() {
  const list = document.getElementById("cartList");
  const total = document.getElementById("total");

  list.innerHTML = "";
  let sum = 0;

  cart.forEach((c, i) => {
    const div = document.createElement("div");
    div.className = "item";
    div.textContent = `${c.name} - ${c.price}円`;
    div.onclick = () => {
      cart.splice(i, 1);
      renderCart();
    };
    list.appendChild(div);

    sum += c.price;
  });

  total.textContent = sum;
}

//--------------------
// 会員検索
//--------------------
let currentMember = null;

async function searchMember() {
  const phone = searchPhone.value;
  if (!phone) return alert("電話番号を入力");

  const r = await apiGet(`action=member&phone=${phone}`);

  if (!r.ok) {
    memberInfo.innerHTML = "該当なし";
    currentMember = null;
    return;
  }

  currentMember = r.member;
  memberInfo.innerHTML = `
    <p>名前：${r.member.name}</p>
    <p>ポイント：${r.member.point}</p>
  `;
}

//--------------------
// 現金決済
//--------------------
async function payCash() {
  const items = cart.map(c => ({ id: c.id, qty: 1, price: c.price }));
  const total = cart.reduce((a, b) => a + b.price, 0);

  let use = parseInt(usePoint.value || 0);
  if (use < 0) use = 0;

  let finalPrice = total;

  // 会員 & ポイント使用
  if (currentMember && use > 0) {
    if (use > currentMember.point) return alert("ポイント不足");
    if (use > total) return alert("合計超のポイントは使えません");

    await apiPost("memberUsePoint", {
      phone: currentMember.phone,
      use
    });

    finalPrice -= use;
  }

  // 注文登録
  await apiPost("order", {
    items,
    total: finalPrice,
    pay_type: "cash",
    staff: "staff",
    store_id: 1
  });

  // ポイント付与（1%）
  if (currentMember) {
    const add = Math.floor(finalPrice * 0.01);
    await apiPost("memberAddPoint", {
      phone: currentMember.phone,
      add
    });
  }

  alert("決済完了");

  cart = [];
  usePoint.value = "";
  currentMember = null;
  renderCart();
  memberInfo.innerHTML = "";
}

//--------------------
// QR決済
//--------------------
let waitingQR = null;

async function payQR() {
  const token = Math.floor(100000 + Math.random() * 900000);

  const items = cart.map(c => ({ id: c.id, qty: 1, price: c.price }));
  const total = cart.reduce((a, b) => a + b.price, 0);

  let use = parseInt(usePoint.value || 0);

  let finalPrice = total - (use || 0);

  if (currentMember && use > 0) {
    if (use > currentMember.point) return alert("ポイント不足");
    if (use > total) return alert("使いすぎ");

    await apiPost("memberUsePoint", { phone: currentMember.phone, use });
  }

  waitingQR = { token, items, finalPrice };

  alert(`お客様に番号 ${token} を入力してもらってください`);

  startQRCheck();
}

async function startQRCheck() {
  const timer = setInterval(async () => {
    if (!waitingQR) return clearInterval(timer);

    const r = await apiPost("qrPay", { token: waitingQR.token });
    if (!r.ok) return;

    await apiPost("order", {
      items: waitingQR.items,
      total: waitingQR.finalPrice,
      pay_type: "qr",
      qr_token: waitingQR.token,
      staff: "staff",
      store_id: 1
    });

    // 付与
    if (currentMember) {
      const add = Math.floor(waitingQR.finalPrice * 0.01);
      await apiPost("memberAddPoint", {
        phone: currentMember.phone,
        add
      });
    }

    alert("QR決済完了");

    cart = [];
    waitingQR = null;
    usePoint.value = "";
    renderCart();
    currentMember = null;
  }, 3000);
}

//--------------------
// 管理画面
//--------------------
async function loadAdmin() {
  // 会員
  const m = await apiGet("action=memberAll");
  memberList.innerHTML = m.members
    .map(v => `${v.name} ${v.phone} / ${v.point}pt`)
    .join("<br>");

  // 商品
  const p = await apiGet("action=products");
  adminProductList.innerHTML = p.products
    .map(v => `${v.name} - ${v.price}`)
    .join("<br>");

  // 注文
  const o = await apiGet("action=orderAll");
  orderList.innerHTML = o.orders
    .map(v => `#${v.id} : ${v.total}円`)
    .join("<br>");
}

// ページ読み込み
window.onload = () => {
  if (location.pathname.includes("admin")) {
    loadAdmin();
  } else {
    loadProducts();
  }
};
