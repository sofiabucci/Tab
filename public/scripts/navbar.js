const modalMap = {
  playBtn: 'setupModal',
  rulesBtn: 'rulesModal',
  classBtn: 'classModal',
  loginBtn: 'loginModal'
};

for (const [btnId, modalId] of Object.entries(modalMap)) {
  const btn = document.getElementById(btnId);
  const modal = document.getElementById(modalId);
  const close = modal.querySelector('.close');

  btn.addEventListener('click', () => modal.classList.remove('hidden'));
  close.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
}
