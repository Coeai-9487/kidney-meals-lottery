// ---------- 設定 ----------
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSVWGYESD-f1IDpEkByWlJv2DLORNGzjq5m4DplIJ6Jw_YrFMf-4GTpogvugNZC_lsNWYs-lESUnKs7/pub?output=csv';

let state = { breakfast: [], lunch: [], dinner: [], snack: [] };
let isDrawing = false; // 防止連續抽籤

const loadStatusEl = document.getElementById('load-status');
loadStatusEl.textContent = '資料載入中...';

// ---------- 抓取 Google Sheet (PapaParse) ----------
Papa.parse(SHEET_CSV_URL, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    const data = results.data;

    console.log('抓到的原始資料', data);

    data.forEach(row => {
      const category = row.category?.trim().toLowerCase();
      if (category && state[category]) {
        state[category].push({
          store: row.store?.trim() || '',
          name: row.name?.trim() || '',
          price: row.price?.trim() || '',
          daysOpen: row.daysOpen?.trim() || ''
        });
      }
    });

    const totalCount = Object.values(state).reduce((sum, arr) => sum + arr.length, 0);
    loadStatusEl.textContent = totalCount > 0
      ? `資料載入完成，共 ${totalCount} 筆餐點｜最後更新：${new Date().toLocaleString('zh-TW')}`
      : '資料已抓取，但目前沒有任何餐點選項';

    console.log('整理後的資料', state);
  },
  error: function(err) {
    loadStatusEl.textContent = '讀取資料失敗';
    console.error(err);
  }
});

// ---------- 顯示今天日期 ----------
const today = new Date();
const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
document.getElementById('today-date').textContent = today.toLocaleDateString('zh-TW', dateOptions);

// ---------- 按鈕特效 ----------
const clickSound = document.getElementById("clickSound");

document.querySelectorAll(".fancy-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    // 音效
    clickSound.currentTime = 0;
    clickSound.play();
    clickSound.volume = 0.5;

    // 水波紋
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.classList.add("ripple");
    ripple.style.left = (e.clientX - rect.left) + "px";
    ripple.style.top = (e.clientY - rect.top) + "px";
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    // 泡泡：隨機位置 → 放大 → 消失
    const bubbleCount = 8 + Math.floor(Math.random() * 4); // 8~11 個泡泡
    for (let i = 0; i < bubbleCount; i++) {
      const bubble = document.createElement("span");
      bubble.classList.add("bubble");

      // 隨機初始大小
      const size = 13 + Math.random() * 12; // 13~25 px
      bubble.style.width = bubble.style.height = size + "px";
      bubble.style.position = "absolute";

      // 隨機位置 (距離按鈕邊緣 0~90%)
      bubble.style.left = Math.random() * 90 + "%";
      bubble.style.top = Math.random() * 90 + "%";

      // 初始透明度和縮放
      bubble.style.opacity = "0.8";
      bubble.style.transform = "scale(0.3)";

      // 設定動畫：放大 + 透明消失
      const duration = 1000 + Math.random() * 600; // 1~1.6 秒
      bubble.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;

      btn.appendChild(bubble);

      // 觸發動畫
      requestAnimationFrame(() => {
        bubble.style.transform = `scale(${1 + Math.random()})`; // 放大到 1~2 倍
        bubble.style.opacity = "0";
      });

      // 移除泡泡
      setTimeout(() => bubble.remove(), duration);
    }

    // 按鈕彈跳
    btn.classList.remove('bounce');
    void btn.offsetWidth; 
    btn.classList.add('bounce');
  });
});

// ---------- 抽籤按鈕事件 ----------
document.querySelectorAll('.draw-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // ⭐按鈕彈跳動畫
    btn.classList.remove('bounce');
    void btn.offsetWidth; // 重新觸發動畫
    btn.classList.add('bounce');

    if (isDrawing) return; // 防止狂按
    isDrawing = true;

    const timeslot = btn.getAttribute('data-timeslot');
    const arr = state[timeslot];
    const resultEl = document.getElementById(timeslot + '-result');
    resultEl.style.color = '#3b2f2f';

    // 無資料
    if (!arr || arr.length === 0) {
      resultEl.textContent = '這時段沒有放東西ㄟ，沒辦法抽';
      resultEl.style.color = 'red';
      isDrawing = false;
      return;
    }

    // 今天的英文星期（Mon Tue Wed...）
    const weekday = today.toLocaleString('en-US', { weekday: 'short' });

    // 過濾今天有營業的餐點
    const availableMeals = arr.filter(item => {
      const days = item.daysOpen.split(',').map(d => d.trim());
      return days.includes(weekday);
    });

    // 都沒開
    if (availableMeals.length === 0) {
      resultEl.textContent = '店家今天都沒開，媽媽看起來要餓肚子ㄌ😢';
      resultEl.style.color = 'red';
      isDrawing = false;
      return;
    }

    // ---------- ⭐ 載入動畫：「抽籤中. .. ...」 ----------
    let dotCount = 0;
    resultEl.style.color = '#555';
    resultEl.textContent = '抽籤中.';
    const loadingInterval = setInterval(() => {
      dotCount = (dotCount + 1) % 3;
      resultEl.textContent = '抽籤中' + '.'.repeat(dotCount + 1);
    }, 350);

    // 偽延遲（做出抽籤感）
    setTimeout(() => {
      clearInterval(loadingInterval);

      // ---------- ⭐⭐ 兩階段抽籤：先抽店家，再抽品項 ----------
      const grouped = {};
      availableMeals.forEach(item => {
        if (!grouped[item.store]) grouped[item.store] = [];
        grouped[item.store].push(item);
      });

      const storeNames = Object.keys(grouped);
      const chosenStore = storeNames[Math.floor(Math.random() * storeNames.length)];

      const items = grouped[chosenStore];
      const finalMeal = items[Math.floor(Math.random() * items.length)];

      // ---------- 顯示結果 ----------
      resultEl.style.color = '#3b2f2f';
      resultEl.innerHTML =
        `店家名稱：${finalMeal.store}<br>` +
        `餐點名稱：${finalMeal.name}<br>` +
        `金額：${finalMeal.price} 元`;

      isDrawing = false;
    }, 1300); 
  });
});
