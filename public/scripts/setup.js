fetch("templates/setup.html")
      .then(response => response.text())
      .then(html => {
        document.getElementById("setup-container").innerHTML = html;
      })
      .catch(err => console.error("Erro ao carregar setup:", err));