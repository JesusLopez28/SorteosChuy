import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { database } from './firebase';
import { ref, get } from 'firebase/database';
import './PublicWishesView.css';

function PublicWishesView() {
  const { exchangeId } = useParams();
  
  const [exchange, setExchange] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [allWishes, setAllWishes] = useState({});
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      await loadExchangeAndWishes();
      
      // Detectar participantId en la URL
      const urlParams = new URLSearchParams(window.location.search);
      const participantId = urlParams.get('participantId');
      
      if (participantId) {
        setSelectedParticipant(participantId);
      }
    };
    
    initialize();
  }, [exchangeId]);

  const loadExchangeAndWishes = async () => {
    try {
      const exchangeRef = ref(database, `exchanges/${exchangeId}`);
      const snapshot = await get(exchangeRef);

      if (!snapshot.exists()) {
        setMessage({ text: 'Intercambio no encontrado', type: 'error' });
        setLoading(false);
        return;
      }

      const data = snapshot.val();
      setExchange(data);

      const participantsList = data.participants 
        ? Object.entries(data.participants).map(([id, name]) => ({ id, name }))
        : [];
      setParticipants(participantsList);

      // Cargar todas las listas de deseos
      const wishesData = data.wishes || {};
      setAllWishes(wishesData);

      setLoading(false);
    } catch (error) {
      setMessage({ text: 'Error al cargar datos: ' + error.message, type: 'error' });
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  if (loading) {
    return (
      <div className="public-wishes-container">
        <div className="loading-spinner">
          <div className="spinner">🎁</div>
          <p>Cargando listas de deseos...</p>
        </div>
      </div>
    );
  }

  if (!exchange) {
    return (
      <div className="public-wishes-container">
        <div className="error-container">
          <h1>❌</h1>
          <p>No se encontró el intercambio</p>
        </div>
      </div>
    );
  }

  const selectedWishes = selectedParticipant && allWishes[selectedParticipant]
    ? allWishes[selectedParticipant]
    : null;

  return (
    <div className="public-wishes-container">
      <div className="public-wishes-content">
        <header className="public-wishes-header">
          <h1>🎁 {exchange.name} 🎅</h1>
          <p className="subtitle">✨ Listas de Deseos de los Participantes ✨</p>
        </header>

        {message.text && (
          <div className={`public-wishes-message public-wishes-message-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="selection-container">
          <div className="selection-card">
            <h2>👤 ¿De quién quieres ver la lista?</h2>
            <p className="selection-hint">Selecciona un participante para ver sus deseos</p>
            <select
              value={selectedParticipant}
              onChange={(e) => setSelectedParticipant(e.target.value)}
              className="participant-select"
            >
              <option value="">Selecciona un participante...</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {allWishes[p.id]?.items?.length > 0 ? `(${allWishes[p.id].items.length} deseos)` : '(sin lista)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedParticipant && selectedWishes && selectedWishes.items && selectedWishes.items.length > 0 && (
          <div className="wishes-display-container">
            <h2 className="wishes-title">
              🎁 Lista de deseos de <span className="participant-name">{selectedWishes.participantName}</span>
            </h2>
            
            <div className="wishes-grid">
              {selectedWishes.items.map((wish, index) => (
                <div key={wish.id} className="wish-card">
                  <div className="wish-number-badge">#{index + 1}</div>
                  <h3 className="wish-name">{wish.name}</h3>
                  
                  {wish.description && (
                    <p className="wish-description">{wish.description}</p>
                  )}
                  
                  {wish.imageBase64 && (
                    <div className="wish-image-container">
                      <img src={wish.imageBase64} alt={wish.name} className="wish-image" />
                    </div>
                  )}
                  
                  {wish.purchaseLink && (
                    <a 
                      href={wish.purchaseLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="wish-link"
                    >
                      🛒 Ver en tienda
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedParticipant && (!selectedWishes || !selectedWishes.items || selectedWishes.items.length === 0) && (
          <div className="no-wishes-container">
            <div className="no-wishes-card">
              <div className="no-wishes-icon">📝</div>
              <h3>Sin lista de deseos</h3>
              <p>{participants.find(p => p.id === selectedParticipant)?.name} aún no ha creado su lista de deseos.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicWishesView;
