import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { database } from './firebase';
import { ref, get, set } from 'firebase/database';
import html2canvas from 'html2canvas';
import './ResultView.css';

function ResultView() {
  const { exchangeId } = useParams();
  const navigate = useNavigate();
  const resultRef = useRef(null);

  const [exchange, setExchange] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [spinningNames, setSpinningNames] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExchangeData();
  }, [exchangeId]);

  const loadExchangeData = async () => {
    try {
      const exchangeRef = ref(database, `exchanges/${exchangeId}`);
      const snapshot = await get(exchangeRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        setExchange(data);
        
        const participantsList = data.participants 
          ? Object.entries(data.participants).map(([id, name]) => ({ id, name }))
          : [];
        setParticipants(participantsList);
        
        if (!data.drawResults) {
          showMessage('Este sorteo aún no se ha realizado. Por favor espera a que el administrador lo complete.', 'warning');
        }
      } else {
        showMessage('No se encontró el sorteo solicitado.', 'error');
        setTimeout(() => navigate('/'), 3000);
      }
    } catch (error) {
      showMessage('Error al cargar datos: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleConfirm = () => {
    if (!selectedParticipant) {
      showMessage('Por favor selecciona quién eres', 'error');
      return;
    }

    const participant = participants.find(p => p.id === selectedParticipant);
    const alreadyOpened = exchange.revelado?.[selectedParticipant]?.abierto;

    if (alreadyOpened) {
      showMessage(`${participant.name} ya ha visto su resultado anteriormente`, 'warning');
    }

    setShowConfirm(false);
    startSpinAnimation();
  };

  const startSpinAnimation = async () => {
    setIsSpinning(true);
    
    // Obtener el resultado real
    const receiverId = exchange.drawResults[selectedParticipant];
    const receiver = participants.find(p => p.id === receiverId);
    
    // Crear array de nombres para animar
    const allNames = participants.filter(p => p.id !== selectedParticipant).map(p => p.name);
    
    // Simular ruleta mostrando nombres aleatorios
    let counter = 0;
    const maxSpins = 30;
    const interval = setInterval(() => {
      const randomName = allNames[Math.floor(Math.random() * allNames.length)];
      setSpinningNames([randomName]);
      counter++;
      
      if (counter >= maxSpins) {
        clearInterval(interval);
        // Mostrar el resultado final
        setTimeout(() => {
          setSpinningNames([receiver.name]);
          setTimeout(() => {
            setIsSpinning(false);
            setResult(receiver);
            setHasRevealed(true);
            saveReveladoStatus();
          }, 800);
        }, 300);
      }
    }, 100);
  };

  const saveReveladoStatus = async () => {
    try {
      const revelado = exchange.revelado || {};
      revelado[selectedParticipant] = {
        abierto: true,
        timestamp: Date.now()
      };
      await set(ref(database, `exchanges/${exchangeId}/revelado`), revelado);
    } catch (error) {
      console.error('Error al guardar estado revelado:', error);
    }
  };

  const handleSaveImage = async () => {
    if (!resultRef.current) return;

    try {
      showMessage('Preparando imagen...', 'info');
      
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: '#FFF8DC',
        scale: 2,
        logging: false,
        useCORS: true
      });

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const participantName = participants.find(p => p.id === selectedParticipant)?.name || 'Participante';
        link.download = `amigo-secreto-${participantName}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showMessage('¡Imagen guardada exitosamente!', 'success');
      });
    } catch (error) {
      showMessage('Error al guardar imagen: ' + error.message, 'error');
    }
  };

  const handleReset = () => {
    setSelectedParticipant('');
    setResult(null);
    setHasRevealed(false);
    setIsSpinning(false);
    setSpinningNames([]);
  };

  if (loading) {
    return (
      <div className="result-view-container">
        <div className="loading-spinner">
          <div className="spinner">🎁</div>
          <p>Cargando sorteo...</p>
        </div>
      </div>
    );
  }

  if (!exchange || !exchange.drawResults) {
    return (
      <div className="result-view-container">
        <div className="error-container">
          <h1>⚠️</h1>
          <p>{message.text || 'Este sorteo no está disponible'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="result-view-container">
      <div className="result-view-content" style={{overflow: 'visible'}}>
        <header className="result-header">
          <h1>🎄 {exchange.name} 🎅</h1>
          <p className="subtitle">✨ Descubre tu Amigo Secreto ✨</p>
        </header>

        {message.text && (
          <div className={`result-message result-message-${message.type}`}>
            {message.text}
          </div>
        )}

        {!hasRevealed && !isSpinning && (
          <div className="selection-container">
            <div className="selection-card">
              <h2>👤 ¿Quién eres?</h2>
              <select
                value={selectedParticipant}
                onChange={(e) => setSelectedParticipant(e.target.value)}
                className="participant-select"
              >
                <option value="">Selecciona tu nombre...</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={!selectedParticipant}
                className="btn-reveal"
              >
                🎁 Ver mi Amigo Secreto
              </button>
            </div>
          </div>
        )}

        {showConfirm && (
          <div className="confirm-overlay">
            <div className="confirm-modal">
              <div className="confirm-icon">🎅</div>
              <h3>¿Estás seguro?</h3>
              <p>
                Confirmas que eres <strong>{participants.find(p => p.id === selectedParticipant)?.name}</strong>?
              </p>
              <div className="confirm-actions">
                <button onClick={handleConfirm} className="btn-confirm-yes">
                  ✅ Sí, soy yo
                </button>
                <button onClick={() => setShowConfirm(false)} className="btn-confirm-no">
                  ❌ No, cambiar
                </button>
              </div>
            </div>
          </div>
        )}

        {isSpinning && (
          <div className="spinner-container">
            <div className="roulette">
              <div className="roulette-wheel">
                {spinningNames.map((name, index) => (
                  <div key={index} className="spinning-name">
                    🎁 {name} 🎁
                  </div>
                ))}
              </div>
            </div>
            <p className="spinner-text">🎲 Girando la ruleta... 🎲</p>
          </div>
        )}

        {hasRevealed && result && (
          <div className="result-reveal" ref={resultRef}>
            <div className="result-card-big">
              <div className="confetti">🎉</div>
              <h2>🎊 ¡Tu Amigo Secreto es! 🎊</h2>
              <div className="result-name">
                <span className="giver-name">
                  {participants.find(p => p.id === selectedParticipant)?.name}
                </span>
                <span className="arrow-big">🎁 → 🎁</span>
                <span className="receiver-name">{result.name}</span>
              </div>
              <div className="result-message-box">
                <p>🎅 Le darás tu regalo a <strong>{result.name}</strong> 🎄</p>
                <p className="result-tip">✨ ¡Prepara un regalo especial! ✨</p>
              </div>
              <div className="result-actions">
                <button onClick={handleSaveImage} className="btn-save-image">
                  💾 Guardar Imagen
                </button>
                <button onClick={handleReset} className="btn-reset">
                  🔄 Ver Otro Resultado
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResultView;
