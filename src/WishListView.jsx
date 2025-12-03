import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { database } from './firebase';
import { ref, get } from 'firebase/database';
import WishListForm from './WishListForm.jsx';
import './WishListView.css';

function WishListView() {
  const { exchangeId } = useParams();
  const navigate = useNavigate();

  const [exchange, setExchange] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      await loadExchangeData();
      
      // Detectar participantId en la URL después de cargar datos
      const urlParams = new URLSearchParams(window.location.search);
      const participantId = urlParams.get('participantId');
      
      if (participantId) {
        setSelectedParticipant(participantId);
        setConfirmed(true);
      }
    };
    
    initialize();
  }, [exchangeId]);

  const loadExchangeData = async () => {
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

      // Igual que en ResultView.jsx: el valor directo es el nombre
      const participantsList = data.participants 
        ? Object.entries(data.participants).map(([id, name]) => ({ id, name }))
        : [];
      setParticipants(participantsList);
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

  const handleConfirm = () => {
    if (!selectedParticipant) {
      showMessage('Por favor selecciona tu nombre', 'warning');
      return;
    }
    setConfirmed(true);
  };

  const handleReset = () => {
    setSelectedParticipant('');
    setConfirmed(false);
  };

  if (loading) {
    return (
      <div className="wishlist-view-container">
        <div className="loading-spinner">
          <div className="spinner">🎁</div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!exchange) {
    return (
      <div className="wishlist-view-container">
        <div className="error-container">
          <h1>❌</h1>
          <p>No se encontró el intercambio</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-view-container">
      <div className="wishlist-view-content">
        <header className="wishlist-header-main">
          <h1>🎁 {exchange.name} 🎅</h1>
          <p className="subtitle">✨ Comparte tu Lista de Deseos ✨</p>
        </header>

        {message.text && (
          <div className={`wishlist-message wishlist-message-${message.type}`}>
            {message.text}
          </div>
        )}

        {!confirmed ? (
          <div className="selection-container">
            <div className="selection-card">
              <h2>👤 ¿Quién eres?</h2>
              <p className="selection-hint">Selecciona tu nombre para crear o editar tu lista de deseos</p>
              <select
                value={selectedParticipant}
                onChange={(e) => setSelectedParticipant(e.target.value)}
                className="participant-select"
              >
                <option value="">Selecciona tu nombre...</option>
                {participants.length > 0 ? (
                    participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                ) : (
                  <option disabled>Cargando participantes...</option>
                )}
              </select>
              <button
                onClick={handleConfirm}
                disabled={!selectedParticipant}
                className="btn-confirm"
              >
                ✅ Continuar
              </button>
            </div>
          </div>
        ) : (
          <div className="wishlist-form-wrapper">
            <div className="participant-info">
              <p>Creando lista de deseos para: <strong>{participants.find(p => p.id === selectedParticipant)?.name}</strong></p>
              <button onClick={handleReset} className="btn-change">
                🔄 Cambiar persona
              </button>
            </div>
            
            <WishListForm
              exchangeId={exchangeId}
              participantId={selectedParticipant}
              participantName={participants.find(p => p.id === selectedParticipant)?.name}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default WishListView;
