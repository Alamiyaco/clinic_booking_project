const config = window.APP_CONFIG || {};

const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const cardsWrap = document.getElementById('bookingCards');
const todayList = document.getElementById('todayList');
const filterButtons = document.querySelectorAll('.filter-btn');

const countPending = document.getElementById('countPending');
const countApproved = document.getElementById('countApproved');
const countRejected = document.getElementById('countRejected');
const countToday = document.getElementById('countToday');

let currentFilter = 'ALL';
let bookings = [];

function getDemoBookings() {
  const today = new Date().toISOString().split('T')[0];
  return [
    { bookingId: 'DENT-20260418-001', fullName: 'محمد أحمد', phone: '07700000001', service: 'كشف', bookingDate: today, bookingTime: '09:30 AM', notes: 'ألم بسيط', status: 'Pending', createdAt: '2026-04-18 09:00' },
    { bookingId: 'DENT-20260418-002', fullName: 'سارة علي', phone: '07700000002', service: 'تنظيف', bookingDate: today, bookingTime: '10:30 AM', notes: '', status: 'Approved', createdAt: '2026-04-18 09:05' },
    { bookingId: 'DENT-20260418-003', fullName: 'أحمد كريم', phone: '07700000003', service: 'حشوة', bookingDate: '2026-04-20', bookingTime: '04:00 PM', notes: 'مراجعة سابقة', status: 'Rejected', createdAt: '2026-04-18 09:12' }
  ];
}

function init() {
  searchInput.addEventListener('input', render);
  refreshBtn.addEventListener('click', loadBookings);
  filterButtons.forEach(btn => btn.addEventListener('click', () => changeFilter(btn.dataset.filter)));
  loadBookings();
}

async function loadBookings() {
  try {
    if (!config.apiBaseUrl || config.apiBaseUrl.includes('PASTE_YOUR')) {
      bookings = getDemoBookings();
      render();
      return;
    }

    const url = new URL(config.apiBaseUrl);
    url.searchParams.set('action', 'listBookings');

    const response = await fetch(url.toString());
    const data = await response.json();
    bookings = Array.isArray(data.bookings) ? data.bookings : [];
    render();
  } catch (error) {
    console.error(error);
    cardsWrap.innerHTML = '<div class="empty-state">تعذر تحميل البيانات حالياً.</div>';
  }
}

function changeFilter(filter) {
  currentFilter = filter;
  filterButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter));
  render();
}

function render() {
  const keyword = searchInput.value.trim().toLowerCase();
  const filtered = bookings.filter(item => {
    const matchesFilter = currentFilter === 'ALL' ? true : item.status === currentFilter;
    const haystack = `${item.fullName} ${item.phone} ${item.service} ${item.bookingId}`.toLowerCase();
    const matchesSearch = keyword ? haystack.includes(keyword) : true;
    return matchesFilter && matchesSearch;
  });

  updateOverview();
  renderCards(filtered);
  renderTodayList();
}

function updateOverview() {
  const today = new Date().toISOString().split('T')[0];
  countPending.textContent = bookings.filter(b => b.status === 'Pending').length;
  countApproved.textContent = bookings.filter(b => b.status === 'Approved').length;
  countRejected.textContent = bookings.filter(b => b.status === 'Rejected').length;
  countToday.textContent = bookings.filter(b => b.status === 'Approved' && b.bookingDate === today).length;
}

function renderCards(list) {
  if (!list.length) {
    cardsWrap.innerHTML = '<div class="empty-state">لا توجد طلبات مطابقة حالياً.</div>';
    return;
  }

  cardsWrap.innerHTML = list.map(item => `
    <article class="booking-card">
      <div class="booking-card-top">
        <div>
          <p class="eyebrow">${item.bookingId || '—'}</p>
          <h3>${item.fullName}</h3>
        </div>
        ${renderStatusTag(item.status)}
      </div>

      <div class="booking-meta">
        <div class="meta-box"><span>الهاتف</span><strong>${item.phone}</strong></div>
        <div class="meta-box"><span>الخدمة</span><strong>${item.service}</strong></div>
        <div class="meta-box"><span>التاريخ</span><strong>${item.bookingDate}</strong></div>
        <div class="meta-box"><span>الوقت</span><strong>${item.bookingTime}</strong></div>
      </div>

      <div class="meta-box" style="margin-bottom:14px;">
        <span>ملاحظات</span>
        <strong>${item.notes || 'لا توجد ملاحظات'}</strong>
      </div>

      <div class="booking-actions">
        ${item.status === 'Pending' ? `<button class="action-btn approve" onclick="updateStatus('${item.bookingId}', 'Approved')">قبول</button>` : ''}
        ${item.status === 'Pending' ? `<button class="action-btn reject" onclick="updateStatus('${item.bookingId}', 'Rejected')">رفض</button>` : ''}
        <a class="action-btn" target="_blank" href="${buildWhatsAppLink(item)}">فتح واتساب</a>
        <button class="action-btn" onclick="copyText('${item.phone}')">نسخ الرقم</button>
      </div>
    </article>
  `).join('');
}

function renderStatusTag(status) {
  if (status === 'Approved') return '<span class="approved-tag">Approved</span>';
  if (status === 'Rejected') return '<span class="rejected-tag">Rejected</span>';
  return '<span class="pending-tag">Pending</span>';
}

function renderTodayList() {
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(item => item.status === 'Approved' && item.bookingDate === today);

  if (!todayBookings.length) {
    todayList.innerHTML = '<div class="empty-state">لا توجد مواعيد مؤكدة لهذا اليوم.</div>';
    return;
  }

  todayList.innerHTML = todayBookings.map(item => `
    <div class="today-item">
      <strong>${item.fullName}</strong>
      <p>${item.service} — ${item.bookingTime}</p>
      <p>${item.phone}</p>
    </div>
  `).join('');
}

function buildWhatsAppLink(item) {
  const normalizedPhone = item.phone.replace(/^0/, '964');
  const message = item.status === 'Approved'
    ? `مرحباً ${item.fullName}، تم تثبيت موعدكم بتاريخ ${item.bookingDate} الساعة ${item.bookingTime}. نرجو الحضور قبل الموعد بـ 10 دقائق.`
    : item.status === 'Rejected'
      ? `مرحباً ${item.fullName}، نعتذر، لم يتم اعتماد الموعد المطلوب. يرجى اختيار وقت آخر أو التواصل مع العيادة.`
      : `مرحباً ${item.fullName}، طلبكم قيد المراجعة حالياً.`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

async function updateStatus(bookingId, newStatus) {
  try {
    if (!config.apiBaseUrl || config.apiBaseUrl.includes('PASTE_YOUR')) {
      bookings = bookings.map(item => item.bookingId === bookingId ? { ...item, status: newStatus } : item);
      render();
      return;
    }

    const response = await fetch(config.apiBaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'updateStatus', bookingId, status: newStatus })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'فشل التحديث');

    await loadBookings();
  } catch (error) {
    console.error(error);
    alert(error.message || 'تعذر تحديث الحالة');
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error(error);
  }
}

window.updateStatus = updateStatus;
window.copyText = copyText;

init();
