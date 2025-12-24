// ---------- 設定 ----------
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSVWGYESD-f1IDpEkByWlJv2DLORNGzjq5m4DplIJ6Jw_YrFMf-4GTpogvugNZC_lsNWYs-lESUnKs7/pub?output=csv';

let state = { breakfast: [], lunch: [], dinner: [], snack: [] };
let isDrawing = false; // 防止連續抽籤

const loadStatusEl = document.getElementById('load-status');
loadStatusEl.textContent = '資料載入中...';

// skeleton placeholders removed — no delayed loading indicator

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

    // 資料載入完成

    console.log('整理後的資料', state);
  },
  error: function(err) {
    loadStatusEl.textContent = '讀取資料失敗';
    console.error(err);
    // error handling
  }
});

// ---------- 顯示今天日期 ----------
const today = new Date();
const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
document.getElementById('today-date').textContent = today.toLocaleDateString('zh-TW', dateOptions);

// ---------- 設定：動畫/音效開關（localStorage） ----------
const clickSound = document.getElementById("clickSound");
const defaultSettings = { anim: true, sound: true };
let acSettings = defaultSettings;
try {
  const saved = localStorage.getItem('ac_settings');
  if (saved) acSettings = Object.assign({}, defaultSettings, JSON.parse(saved));
} catch (e) { acSettings = defaultSettings; }

// 控制項綁定（若存在）
const animToggle = document.getElementById('toggle-anim');
const soundToggle = document.getElementById('toggle-sound');
if (animToggle) { animToggle.checked = acSettings.anim; animToggle.addEventListener('change', () => { acSettings.anim = animToggle.checked; localStorage.setItem('ac_settings', JSON.stringify(acSettings)); }); }
if (soundToggle) { soundToggle.checked = acSettings.sound; soundToggle.addEventListener('change', () => { acSettings.sound = soundToggle.checked; localStorage.setItem('ac_settings', JSON.stringify(acSettings)); }); }

// 簡化 ripple + bounce（不要在這邊觸發葉子）
document.querySelectorAll(".fancy-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    // 音效（若開）
    if (acSettings.sound) {
      try { clickSound.currentTime = 0; clickSound.volume = 0.22; clickSound.play(); } catch (err){}
    }

    // 水波紋
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.classList.add("ripple");
    ripple.style.left = (e.clientX - rect.left) + "px";
    ripple.style.top = (e.clientY - rect.top) + "px";
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    // 按鈕彈跳 (bounce)
    btn.classList.remove('bounce'); void btn.offsetWidth; btn.classList.add('bounce');
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

      // 若開啟動畫：依結果稀有度產生葉子粒子
      if (acSettings.anim) {
        const rarity = getRarity(finalMeal);
        const opts = {
          count: rarity === 'epic' ? 20 : (rarity === 'rare' ? 12 : 8),
          color: rarity === 'epic' ? '#FFD166' : (rarity === 'rare' ? '#7BC67B' : '#3E8E41')
        };
        createLeafBurst(btn, opts);
      }

      isDrawing = false;
    }, 1300); 
  });
});

// ---------- helper: parse price -> rarity ----------
function getRarity(item){
  if (!item || !item.price) return 'normal';
  const n = parseInt(item.price.replace(/[^0-9]/g, '')) || 0;
  if (n >= 300) return 'epic';
  if (n >= 150) return 'rare';
  return 'normal';
}

// ---------- helper: 建立葉子爆散（可指定顏色與數量） ----------
function createLeafBurst(btn, {count = 10, color = '#3E8E41'} = {}){
  const rect = btn.getBoundingClientRect();
  const centerX = rect.width/2; const centerY = rect.height/2;
  for (let i=0;i<count;i++){
    const leaf = document.createElement('span'); leaf.classList.add('leaf');
    const w = 10 + Math.random()*18; const h = Math.round(w*0.9);
    leaf.style.width = w+'px'; leaf.style.height = h+'px';
    const jitterX = (Math.random()-0.5)*30; const jitterY = (Math.random()-0.5)*20;
    leaf.style.left = (centerX + jitterX) + 'px'; leaf.style.top = (centerY + jitterY) + 'px';

    const xDir = (Math.random() - 0.5) * 220;
    const yDist = -80 - Math.random()*260;
    const rot = (Math.random()>0.5?1:-1)*(120+Math.random()*700);
    const dur = 700 + Math.random()*1200;
    const scale = 0.7 + Math.random()*1.1;

    leaf.style.setProperty('--x', xDir + 'px');
    leaf.style.setProperty('--y', yDist + 'px');
    leaf.style.setProperty('--rot', rot + 'deg');
    leaf.style.setProperty('--scale', scale);
    leaf.style.animationDuration = dur + 'ms';

    // 動態設定 svg 顏色（inline svg data uri）
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${encodeURIComponent(color)}" d="M21.7 4.3c-3.5 0-8 3.7-9.6 5.3-1.6 1.6-5.3 6.1-5.3 9.6 0 0 4.2-.6 8.4-4.8 4.2-4.2 4.8-8.4 4.8-8.4z"/></svg>`;
    leaf.style.backgroundImage = `url('data:image/svg+xml;utf8,${svg}')`;

    btn.appendChild(leaf);
    setTimeout(()=>leaf.remove(), dur+120);
  }
}

// Modal 已移除（功能停用）

// skeleton placeholder support removed
