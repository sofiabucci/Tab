document.addEventListener('DOMContentLoaded', function() {
  const modalMap = {
    playBtn: 'setupModal',
    rulesBtn: 'rulesModal', 
    classBtn: 'classModal',
    loginBtn: 'loginModal'
  };

  // Abrir modais
  for (const [btnId, modalId] of Object.entries(modalMap)) {
    const btn = document.getElementById(btnId);
    const modal = document.getElementById(modalId);

    if (btn && modal) {
      btn.addEventListener('click', () => modal.classList.remove('hidden'));
    }
  }

  // Fechar modais ao clicar fora (área escura) - CORRIGIDO
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.add('hidden');
      }
    });
  });

  // Impedir que clique dentro do conteúdo feche a modal
  document.querySelectorAll('.setup-container').forEach(container => {
    container.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  });

  // Fechar modal de regras com ESC key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
      });
    }
  });
});