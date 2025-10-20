document.addEventListener('DOMContentLoaded', function() {
  const rollDiceBtn = document.getElementById('rollDiceBtn');
  const diceResult = document.getElementById('diceResult');
  const diceGif = document.getElementById('diceGif');

  let isRolling = false;

  diceResult.textContent = 'Rolling...';

  rollDiceBtn.addEventListener('click', function() {
    if (isRolling) return; 
    
    isRolling = true;
    
    diceGif.src = "assets/dice.gif";
    diceResult.textContent = 'Rolling...';
    
    const animationTime = 1500;
    
    setTimeout(() => {
      const randomNumber = Math.floor(Math.random() * 6) + 1;
      
      diceGif.src = "assets/dice.gif?" + new Date().getTime();
      
      diceResult.textContent = randomNumber;
      isRolling = false;
            
    }, animationTime);
  });
});