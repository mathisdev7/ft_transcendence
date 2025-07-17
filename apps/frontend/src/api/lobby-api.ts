export async function createGameServer() {
    const res = await fetch('http://localhost:3000/create-game', {
      method: 'POST',
    });
  
    if (!res.ok) throw new Error('Erreur de création du serveur de jeu');
  
    return await res.json(); // { gameId, port }
  }