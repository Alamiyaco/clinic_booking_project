const config = window.APP_CONFIG || {};

const services = [
  'كشف',
  'تنظيف',
  'حشوة',
  'قلع',
  'تقويم',
  'مراجعة'
];

const defaultTimeSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM',
  '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM',
  '04:00 PM', '04:30 PM', '05:00 PM',
  '05:30 PM', '06:00 PM', '06:30 PM'
];

const form = document.getElementById('bookingForm');
const serviceSelect = document.getElementById('service');
const bookingDateInput = document.getElementById('bookingDate');
const slotsGrid = document.getElementById('slotsGrid');
const bookingTimeInput = document.getElementById('bookingTime');
const messageEl = document.getElementById('formMessage');
const submitBtn = document.getElementById('submitBtn');
const serviceHighlights = document.getElementById('serviceHighlights');

let selectedSlot = '';
let unavailableSlots = [];

function init() {
  renderServices();
  renderServiceHighlights();
  setMinDate();
  renderSlots();
  attachEvents();
}

function renderServices() {
  serviceSelect.innerHTML = '<option value="">اختر الخدمة</option>' + services.map(service => `<option value="${service}">${service}</option>`).join('');
}

function renderServiceHighlights() {
  serviceHighlights.innerHTML = services.map(service => `<span>${service}</span>`).join('');
}

function setMinDate() {
  const today = new Date();
  const isoDate = today.toISOString().split('T')[0];
  bookingDateInput.min = isoDate;
  bookingDateInput.value = isoDate;
}

function attachEvents() {
  bookingDateInput.addEventListener('change', handleDateChange);
  form.addEventListener('submit', handleSubmit);
}

async function handleDateChange() {
  selectedSlot = '';
  bookingTimeInput.value = '';
  messageEl.textContent = '';
  await fetchUnavailableSlots();
  renderSlots();
}

async function fetchUnavailableSlots() {
  if (!config.apiBaseUrl || config.apiBaseUrl.includes('PASTE_YOUR')) {
    unavailableSlots = ['09:30 AM', '12:30 PM'];
    return;
  }

  try {
    const url = new URL(config.apiBaseUrl);
    url.searchParams.set('action', 'slots');
    url.searchParams.set('date', bookingDateInput.value);

    const response = await fetch(url.toString());
    const data = await response.json();
    unavailableSlots = Array.isArray(data.unavailableSlots) ? data.unavailableSlots : [];
  } catch (error) {
    console.error(error);
    unavailableSlots = [];
  }
}

function renderSlots() {
  slotsGrid.innerHTML = '';

  defaultTimeSlots.forEach(slot => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'slot-btn';
    button.textContent = slot;

    if (unavailableSlots.includes(slot)) {
      button.classList.add('disabled');
      button.disabled = true;
    }

    if (selectedSlot === slot) {
      button.classList.add('active');
    }

    button.addEventListener('click', () => selectSlot(slot));
    slotsGrid.appendChild(button);
  });
}

function selectSlot(slot) {
  selectedSlot = slot;
  bookingTimeInput.value = slot;
  renderSlots();
}

async function handleSubmit(event) {
  event.preventDefault();
  messageEl.className = 'form-message';
  messageEl.textContent = '';

  if (!form.reportValidity()) {
    showMessage('يرجى إكمال جميع الحقول المطلوبة.', 'error');
    return;
  }

  if (!selectedSlot) {
    showMessage('يرجى اختيار الوقت المتاح.', 'error');
    return;
  }

  const payload = {
    action: 'createBooking',
    fullName: form.fullName.value.trim(),
    phone: form.phone.value.trim(),
    service: form.service.value,
    bookingDate: form.bookingDate.value,
    bookingTime: selectedSlot,
    notes: form.notes.value.trim(),
    status: 'Pending'
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'جاري الإرسال...';

  try {
    if (!config.apiBaseUrl || config.apiBaseUrl.includes('PASTE_YOUR')) {
      await fakeSubmit(payload);
      showMessage('تم استلام طلب الحجز بنجاح وهو الآن بانتظار موافقة الإدارة.', 'success');
      form.reset();
      setMinDate();
      selectedSlot = '';
      bookingTimeInput.value = '';
      renderSlots();
      return;
    }

    const response = await fetch(config.apiBaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'تعذر إرسال الطلب');
    }

    showMessage('تم استلام طلب الحجز بنجاح وهو الآن بانتظار موافقة الإدارة.', 'success');
    form.reset();
    setMinDate();
    selectedSlot = '';
    bookingTimeInput.value = '';
    await fetchUnavailableSlots();
    renderSlots();
  } catch (error) {
    console.error(error);
    showMessage(error.message || 'حدث خطأ أثناء إرسال الطلب.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'إرسال طلب الحجز';
  }
}

function fakeSubmit(payload) {
  return new Promise(resolve => {
    console.log('Demo submit payload:', payload);
    setTimeout(resolve, 800);
  });
}

function showMessage(message, type) {
  messageEl.textContent = message;
  messageEl.classList.add(type);
}

init();
handleDateChange();
