document.addEventListener('DOMContentLoaded', function() {
  const modalMap = {
    playBtn: 'setupModal',
    rulesBtn: 'rulesModal', 
    classBtn: 'classModal',
    loginBtn: 'loginModal'
  };

  // Abrir modais (guard checks in case some elements are missing)
  for (const [btnId, modalId] of Object.entries(modalMap)) {
    const btn = document.getElementById(btnId);
    const modal = document.getElementById(modalId);
    if (!btn || !modal) continue;

    btn.addEventListener('click', () => modal.classList.remove('hidden'));
  }

  // Fechar modais ao clicar fora (área escura)
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

  // Auto-open setup modal on first load so the user configures and starts the game
  const setupModal = document.getElementById('setupModal');
  // Open the setup modal immediately on load so the user configures the game first.
  if (setupModal) setupModal.classList.remove('hidden');

  // Enhance Play button: if a game is running, allow quitting and starting a new one.
  const playBtn = document.getElementById('playBtn');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      console.log('Play button clicked');
      // If modal is currently visible, treat the Play click as "submit setup and start game"
      const setupForm = document.getElementById('setupForm');
      const isModalVisible = setupModal && !setupModal.classList.contains('hidden');

      if (isModalVisible) {
        console.log('Setup modal is visible — submitting setup form to start game');
        // cleanup existing game before starting a new one
        try {
          if (window._currentGameBoard && typeof window._currentGameBoard.cleanup === 'function') {
            window._currentGameBoard.cleanup();
          }
        } catch (err) {
          console.warn('Error cleaning up existing game:', err);
        }
        const parent = document.getElementById('board-container');
        if (parent) parent.innerHTML = '';

        if (setupForm) {
          // Prefer requestSubmit if available (preserves form validation and events)
          if (typeof setupForm.requestSubmit === 'function') setupForm.requestSubmit();
          else setupForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        } else {
          // If no form found, just close modal
          setupModal.classList.add('hidden');
        }

        return;
      }

      // Otherwise open the setup modal so user can configure
      if (setupModal) setupModal.classList.remove('hidden');
    });
  }
});