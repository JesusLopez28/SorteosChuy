import { useState, useEffect } from 'react';
import { database } from './firebase';
import { ref, set, get, remove, push } from 'firebase/database';
import './App.css';

// Contraseña estática para el admin
const ADMIN_PASSWORD = 'ChuySorteos2804#';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('participants');
  const [participants, setParticipants] = useState([]);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [exclusions, setExclusions] = useState({});
  const [drawResults, setDrawResults] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Cargar datos de Firebase al iniciar
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      const participantsRef = ref(database, 'participants');
      const exclusionsRef = ref(database, 'exclusions');
      const resultsRef = ref(database, 'lastDraw');

      const [participantsSnap, exclusionsSnap, resultsSnap] = await Promise.all([
        get(participantsRef),
        get(exclusionsRef),
        get(resultsRef)
      ]);

      if (participantsSnap.exists()) {
        setParticipants(Object.entries(participantsSnap.val()).map(([id, name]) => ({ id, name })));
      }

      if (exclusionsSnap.exists()) {
        setExclusions(exclusionsSnap.val());
      }

      if (resultsSnap.exists()) {
        setDrawResults(resultsSnap.val());
      }
    } catch (error) {
      showMessage('Error al cargar datos: ' + error.message, 'error');
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword('');
      showMessage('¡Bienvenido, Chuy!', 'success');
    } else {
      showMessage('Contraseña incorrecta', 'error');
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const addParticipant = async () => {
    if (!newParticipantName.trim()) {
      showMessage('Por favor ingresa un nombre', 'error');
      return;
    }

    try {
      const participantsRef = ref(database, 'participants');
      const newParticipantRef = push(participantsRef);
      await set(newParticipantRef, newParticipantName.trim());
      
      const newParticipant = { id: newParticipantRef.key, name: newParticipantName.trim() };
      setParticipants([...participants, newParticipant]);
      setNewParticipantName('');
      showMessage('Participante agregado', 'success');
    } catch (error) {
      showMessage('Error al agregar participante: ' + error.message, 'error');
    }
  };

  const deleteParticipant = async (participantId) => {
    try {
      await remove(ref(database, `participants/${participantId}`));
      
      // Limpiar exclusiones relacionadas
      const newExclusions = { ...exclusions };
      delete newExclusions[participantId];
      Object.keys(newExclusions).forEach(id => {
        if (newExclusions[id]) {
          newExclusions[id] = newExclusions[id].filter(excId => excId !== participantId);
        }
      });
      
      await set(ref(database, 'exclusions'), newExclusions);
      
      setParticipants(participants.filter(p => p.id !== participantId));
      setExclusions(newExclusions);
      showMessage('Participante eliminado', 'success');
    } catch (error) {
      showMessage('Error al eliminar participante: ' + error.message, 'error');
    }
  };

  const toggleExclusion = async (giverId, receiverId) => {
    const newExclusions = { ...exclusions };
    
    if (!newExclusions[giverId]) {
      newExclusions[giverId] = [];
    }

    const index = newExclusions[giverId].indexOf(receiverId);
    if (index > -1) {
      newExclusions[giverId].splice(index, 1);
    } else {
      newExclusions[giverId].push(receiverId);
    }

    try {
      await set(ref(database, 'exclusions'), newExclusions);
      setExclusions(newExclusions);
    } catch (error) {
      showMessage('Error al actualizar exclusiones: ' + error.message, 'error');
    }
  };

  const performDraw = async () => {
    if (participants.length < 2) {
      showMessage('Se necesitan al menos 2 participantes', 'error');
      return;
    }

    try {
      const result = generateDraw();
      if (result) {
        await set(ref(database, 'lastDraw'), result);
        setDrawResults(result);
        setActiveTab('results');
        showMessage('¡Sorteo realizado exitosamente!', 'success');
      } else {
        showMessage('No se pudo realizar el sorteo con las exclusiones actuales. Intenta modificarlas.', 'error');
      }
    } catch (error) {
      showMessage('Error al realizar sorteo: ' + error.message, 'error');
    }
  };

  const generateDraw = () => {
    const maxAttempts = 1000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const assignments = {};
      const availableReceivers = [...participants];
      let isValid = true;

      for (const giver of participants) {
        const excluded = exclusions[giver.id] || [];
        const validReceivers = availableReceivers.filter(
          r => r.id !== giver.id && !excluded.includes(r.id)
        );

        if (validReceivers.length === 0) {
          isValid = false;
          break;
        }

        const randomIndex = Math.floor(Math.random() * validReceivers.length);
        const receiver = validReceivers[randomIndex];
        
        assignments[giver.id] = receiver.id;
        availableReceivers.splice(availableReceivers.findIndex(r => r.id === receiver.id), 1);
      }

      if (isValid) {
        return assignments;
      }
    }

    return null;
  };

  const clearResults = async () => {
    try {
      await remove(ref(database, 'lastDraw'));
      setDrawResults(null);
      showMessage('Resultados eliminados', 'success');
    } catch (error) {
      showMessage('Error al eliminar resultados: ' + error.message, 'error');
    }
  };

  const clearAllData = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
      try {
        await remove(ref(database, 'participants'));
        await remove(ref(database, 'exclusions'));
        await remove(ref(database, 'lastDraw'));
        setParticipants([]);
        setExclusions({});
        setDrawResults(null);
        showMessage('Todos los datos han sido eliminados', 'success');
      } catch (error) {
        showMessage('Error al eliminar datos: ' + error.message, 'error');
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <div className="header">
          <h1>🎄 Sorteos Chuy 🎅</h1>
          <p>✨ Sistema de Amigo Secreto Navideño & Año Nuevo ✨</p>
          <p style={{ marginTop: '10px', fontSize: '1.3rem' }}>🎁 ¡Feliz Navidad y Próspero Año Nuevo! 🎉</p>
        </div>
        <div className="login-container">
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="password">🔐 Contraseña de Administrador</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa la contraseña"
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary">
              🎅 Iniciar Sesión
            </button>
          </form>
          {message.text && (
            <div className={`message message-${message.type}`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>🎄 Sorteos Chuy 🎅</h1>
        <p>✨ Sistema de Amigo Secreto Navideño & Año Nuevo ✨</p>
        <p style={{ marginTop: '10px', fontSize: '1.3rem' }}>🎁 ¡Feliz Navidad y Próspero Año Nuevo! 🎉</p>
      </div>

      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="content">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            🎅 Participantes
          </button>
          <button
            className={`tab ${activeTab === 'exclusions' ? 'active' : ''}`}
            onClick={() => setActiveTab('exclusions')}
          >
            🚫 Exclusiones
          </button>
          <button
            className={`tab ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            🎁 Resultados
          </button>
        </div>

        {activeTab === 'participants' && (
          <div>
            <div className="form-group">
              <label>🎄 Agregar Nuevo Participante</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                  placeholder="Nombre del participante"
                  style={{ flex: 1 }}
                />
                <button onClick={addParticipant} className="btn btn-primary">
                  ➕ Agregar
                </button>
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="message message-info" style={{ marginTop: '20px' }}>
                🎅 No hay participantes. Agrega algunos para comenzar el sorteo navideño.
              </div>
            ) : (
              <div className="participants-grid">
                {participants.map((participant) => (
                  <div key={participant.id} className="participant-card">
                    <h3>🎁 {participant.name}</h3>
                    <div className="participant-actions">
                      <button
                        onClick={() => deleteParticipant(participant.id)}
                        className="btn btn-danger"
                      >
                        ❌ Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'exclusions' && (
          <div>
            {participants.length < 2 ? (
              <div className="message message-info">
                🎄 Necesitas al menos 2 participantes para configurar exclusiones.
              </div>
            ) : (
              <div className="exclusions-container">
                {participants.map((giver) => (
                  <div key={giver.id} className="exclusion-item">
                    <h3>🎅 {giver.name} NO puede darle regalo a:</h3>
                    <div className="checkbox-group">
                      {participants
                        .filter(p => p.id !== giver.id)
                        .map((receiver) => (
                          <label key={receiver.id} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={(exclusions[giver.id] || []).includes(receiver.id)}
                              onChange={() => toggleExclusion(giver.id, receiver.id)}
                            />
                            {receiver.name}
                          </label>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div>
            {!drawResults ? (
              <div>
                <div className="message message-info">
                  🎁 No hay resultados de sorteo. Realiza un sorteo navideño para ver los resultados.
                </div>
                <button
                  onClick={performDraw}
                  className="btn btn-primary"
                  style={{ marginTop: '20px' }}
                  disabled={participants.length < 2}
                >
                  🎲 Realizar Sorteo Navideño
                </button>
              </div>
            ) : (
              <div className="results-container">
                <h2>📋 Resultados del Sorteo Navideño 🎄</h2>
                {participants.map((giver) => {
                  const receiverId = drawResults[giver.id];
                  const receiver = participants.find(p => p.id === receiverId);
                  return receiver ? (
                    <div key={giver.id} className="result-card">
                      <span className="giver">🎅 {giver.name}</span>
                      <span className="arrow">🎁 → 🎁</span>
                      <span className="receiver">{receiver.name} 🎄</span>
                    </div>
                  ) : null;
                })}
                <div className="actions-bar">
                  <button onClick={performDraw} className="btn btn-primary">
                    🔄 Repetir Sorteo
                  </button>
                  <button onClick={clearResults} className="btn btn-secondary">
                    🗑️ Limpiar Resultados
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="actions-bar" style={{ marginTop: '30px', paddingTop: '30px', borderTop: '2px solid #DAA520' }}>
          {activeTab !== 'results' && (
            <button
              onClick={performDraw}
              className="btn btn-success"
              disabled={participants.length < 2}
            >
              🎲 Realizar Sorteo Navideño
            </button>
          )}
          <button onClick={clearAllData} className="btn btn-danger">
            🗑️ Eliminar Todos los Datos
          </button>
          <button onClick={() => setIsAuthenticated(false)} className="btn btn-secondary">
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
