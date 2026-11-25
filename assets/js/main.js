// Keep startup failures visible, including a missing catalog or a failed module request.
import('./game.js')
  .then(({ startGame }) => {
    const stop = startGame();
    const onPageHide = (event) => {
      // A bfcache page is frozen, not destroyed; its clocks must survive restoration.
      if (!event.persisted) {
        stop();
        window.removeEventListener('pagehide', onPageHide);
      }
    };
    window.addEventListener('pagehide', onPageHide);
  })
  .catch((error) => {
    console.error(error);
    const box = document.getElementById('mbox');
    const title = document.createElement('h1');
    title.textContent = 'No se pudo abrir El Asadero';
    const detail = document.createElement('p');
    detail.textContent = 'Comprueba tu conexión y vuelve a intentarlo.';
    const retry = document.createElement('button');
    retry.className = 'btn';
    retry.textContent = 'Reintentar';
    retry.onclick = () => location.reload();
    box.replaceChildren(title, detail, retry);
    document.getElementById('modal').classList.remove('off');
  });
