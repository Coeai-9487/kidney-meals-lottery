// ---------- 初始化 ----------
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSVWGYESD-f1IDpEkByWlJv2DLORNGzjq5m4DplIJ6Jw_YrFMf-4GTpogvugNZC_lsNWYs-lESUnKs7/pub?output=csv';

let state = { breakfast: [], lunch: [], dinner: [], snack: [] };
const loadStatusEl = document.getElementById('load-status');
loadStatusEl.textContent = '資料載入中...';

// ---------- 讀取 Google Sheet CSV（使用 PapaParse） ----------
Papa.parse(SHEET_CSV_URL, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    const data = results.data;
    console.log('抓到的原始資料', data);

    data.forEach(row => {
      const category = row.category?.trim().toLowerCase();
      if(category && state[category]){
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
      ? `資料載入完成，共 ${totalCount} 筆餐點` 
      : '資料已抓取，但目前沒有任何餐點選項';
  },
  error: function(err){
    loadStatusEl.textContent = '讀取資料失敗';
    console.error(err);
  }
});

// ---------- 顯示今天日期 ----------
const today = new Date();
const options = { year:'numeric', month:'2-digit', day:'2-digit', weekday:'short' };
document.getElementById('today-date').textContent = today.toLocaleDateString('zh-TW', options);

// ---------- 抽籤 ----------
document.querySelectorAll('.draw-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const timeslot = btn.getAttribute('data-timeslot');
    const arr = state[timeslot];
    const resultEl = document.getElementById(timeslot+'-result');

    if(!arr || arr.length === 0){ 
      resultEl.textContent = '這時段沒有放東西ㄟ，沒辦法抽'; 
      resultEl.style.color = 'red';
      return; 
    }

    const weekday = today.toLocaleString('en-US', { weekday:'short' });
    const availableMeals = arr.filter(item => {
      const days = item.daysOpen.split(',').map(d => d.trim());
      return days.includes(weekday);
    });

    if(availableMeals.length === 0){
      resultEl.textContent = '店家今天都沒開，媽媽看起來要餓肚子ㄌ😢';
      resultEl.style.color = 'red';
      return;
    }

    // 禁止連點
    btn.disabled = true;

    // 初始化抽籤中動畫
    resultEl.style.opacity = 0;
    resultEl.style.transition = 'none';
    let dots = 0;
    resultEl.textContent = '抽籤中';
    resultEl.style.color = '#3b2f2f';
    resultEl.style.opacity = 1;
    resultEl.style.fontSize = '16px';

    const interval = setInterval(() => {
      dots = (dots + 1) % 4; // 0~3
      resultEl.textContent = '抽籤中' + '.'.repeat(dots);
    }, 300);

    // 1.2 秒後顯示最終結果
    setTimeout(() => {
      clearInterval(interval);
      const meal = availableMeals[Math.floor(Math.random() * availableMeals.length)];
      resultEl.innerHTML = `店家名稱：${meal.store}<br>餐點名稱：${meal.name}<br>金額：${meal.price} 元`;
      resultEl.style.transition = 'opacity 0.6s';
      resultEl.style.opacity = 1;

      // 重新啟用按鈕
      btn.disabled = false;
    }, 1200);
  });
});
