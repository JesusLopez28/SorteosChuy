import { useState, useEffect } from 'react';
import { database } from './firebase';
import { ref, set, get, remove, push } from 'firebase/database';
import './App.css';

// Contraseña estática para el admin
const ADMIN_PASSWORD = 'ChuySorteos2804#';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('exchanges');
  
  // Sistema de múltiples intercambios
  const [exchanges, setExchanges] = useState([]);
  const [currentExchangeId, setCurrentExchangeId] = useState(null);
  const [newExchangeName, setNewExchangeName] = useState('');
  
  // Datos del intercambio actual
  const [participants, setParticipants] = useState([]);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [exclusions, setExclusions] = useState({});
  const [drawResults, setDrawResults] = useState(null);
  
  // Revelar resultados individuales
  const [revealedResults, setRevealedResults] = useState({});
  
  const [message, setMessage] = useState({ text: '', type: '' });

  // Cargar intercambios al autenticarse
  useEffect(() => {
    if (isAuthenticated) {
      loadExchanges();
    }
  }, [isAuthenticated]);

  // Cargar datos del intercambio actual
  useEffect(() => {
    if (isAuthenticated && currentExchangeId) {
      loadExchangeData(currentExchangeId);
    }
  }, [currentExchangeId, isAuthenticated]);

  const loadExchanges = async () => {
    try {
      const exchangesRef = ref(database, 'exchanges');
      const snapshot = await get(exchangesRef);
      
      if (snapshot.exists()) {
        const exchangesData = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          name: data.name,
          createdAt: data.createdAt
        }));
        setExchanges(exchangesData);
        
        // Seleccionar el primer intercambio por defecto
        if (exchangesData.length > 0 && !currentExchangeId) {
          setCurrentExchangeId(exchangesData[0].id);
        }
      }
    } catch (error) {
      showMessage('Error al cargar intercambios: ' + error.message, 'error');
    }
  };

  const loadExchangeData = async (exchangeId) => {
    try {
      const exchangeRef = ref(database, `exchanges/${exchangeId}`);
      const snapshot = await get(exchangeRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        
        setParticipants(data.participants ? 
          Object.entries(data.participants).map(([id, name]) => ({ id, name })) : []);
        
        setExclusions(data.exclusions || {});
        setDrawResults(data.drawResults || null);
        setRevealedResults({});
      } else {
        setParticipants([]);
        setExclusions({});
        setDrawResults(null);
        setRevealedResults({});
      }
    } catch (error) {
      showMessage('Error al cargar datos del intercambio: ' + error.message, 'error');
    }
  };

  const createExchange = async () => {
    if (!newExchangeName.trim()) {
      showMessage('Por favor ingresa un nombre para el intercambio', 'error');
      return;
    }

    try {
      const exchangesRef = ref(database, 'exchanges');
      const newExchangeRef = push(exchangesRef);
      
      await set(newExchangeRef, {
        name: newExchangeName.trim(),
        createdAt: Date.now(),
        participants: {},
        exclusions: {},
        drawResults: null
      });

      const newExchange = {
        id: newExchangeRef.key,
        name: newExchangeName.trim(),
        createdAt: Date.now()
      };

      setExchanges([...exchanges, newExchange]);
      setCurrentExchangeId(newExchange.id);
      setNewExchangeName('');
      showMessage('Intercambio creado exitosamente', 'success');
    } catch (error) {
      showMessage('Error al crear intercambio: ' + error.message, 'error');
    }
  };

  const deleteExchange = async (exchangeId) => {
    if (window.confirm('¿Estás seguro de eliminar este intercambio? Se perderán todos sus datos.')) {
      try {
        await remove(ref(database, `exchanges/${exchangeId}`));
        
        const newExchanges = exchanges.filter(e => e.id !== exchangeId);
        setExchanges(newExchanges);
        
        if (currentExchangeId === exchangeId) {
          setCurrentExchangeId(newExchanges.length > 0 ? newExchanges[0].id : null);
        }
        
        showMessage('Intercambio eliminado', 'success');
      } catch (error) {
        showMessage('Error al eliminar intercambio: ' + error.message, 'error');
      }
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
    if (!currentExchangeId) {
      showMessage('Selecciona o crea un intercambio primero', 'error');
      return;
    }

    if (!newParticipantName.trim()) {
      showMessage('Por favor ingresa un nombre', 'error');
      return;
    }

    try {
      const participantsRef = ref(database, `exchanges/${currentExchangeId}/participants`);
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
      await remove(ref(database, `exchanges/${currentExchangeId}/participants/${participantId}`));
      
      // Limpiar exclusiones relacionadas
      const newExclusions = { ...exclusions };
      delete newExclusions[participantId];
      Object.keys(newExclusions).forEach(id => {
        if (newExclusions[id]) {
          newExclusions[id] = newExclusions[id].filter(excId => excId !== participantId);
        }
      });
      
      await set(ref(database, `exchanges/${currentExchangeId}/exclusions`), newExclusions);
      
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
    const otherParticipants = participants.filter(p => p.id !== giverId);
    const currentExcluded = newExclusions[giverId] || [];
    
    // Validar que al menos uno quede sin excluir
    if (index === -1) {
      // Queremos agregar una exclusión
      if (currentExcluded.length >= otherParticipants.length - 1) {
        showMessage('Debes dejar al menos un participante disponible', 'error');
        return;
      }
      newExclusions[giverId].push(receiverId);
    } else {
      // Queremos quitar una exclusión
      newExclusions[giverId].splice(index, 1);
    }

    try {
      await set(ref(database, `exchanges/${currentExchangeId}/exclusions`), newExclusions);
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
      const result = generateDrawImproved();
      if (result) {
        await set(ref(database, `exchanges/${currentExchangeId}/drawResults`), result);
        setDrawResults(result);
        setRevealedResults({});
        setActiveTab('results');
        showMessage('¡Sorteo realizado exitosamente!', 'success');
      } else {
        showMessage('No se pudo realizar el sorteo con las exclusiones actuales. Intenta modificarlas.', 'error');
      }
    } catch (error) {
      showMessage('Error al realizar sorteo: ' + error.message, 'error');
    }
  };

  // Algoritmo mejorado de sorteo usando Fisher-Yates Shuffle con backtracking
  const generateDrawImproved = () => {
    const maxAttempts = 10000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Crear lista de participantes ordenada aleatoriamente
      const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
      
      const assignments = {};
      const used = new Set();
      let success = true;

      for (let i = 0; i < shuffledParticipants.length; i++) {
        const giver = shuffledParticipants[i];
        const excluded = exclusions[giver.id] || [];
        
        // Crear lista de receptores válidos
        const validReceivers = participants.filter(p => 
          p.id !== giver.id && 
          !excluded.includes(p.id) && 
          !used.has(p.id)
        );

        if (validReceivers.length === 0) {
          success = false;
          break;
        }

        // Selección aleatoria con ponderación para evitar deadlocks
        const receiver = validReceivers[Math.floor(Math.random() * validReceivers.length)];
        assignments[giver.id] = receiver.id;
        used.add(receiver.id);
      }

      // Verificar que el sorteo es válido (todos asignados)
      if (success && Object.keys(assignments).length === participants.length) {
        return assignments;
      }
    }

    return null;
  };

  const clearResults = async () => {
    try {
      await remove(ref(database, `exchanges/${currentExchangeId}/drawResults`));
      setDrawResults(null);
      setRevealedResults({});
      showMessage('Resultados eliminados', 'success');
    } catch (error) {
      showMessage('Error al eliminar resultados: ' + error.message, 'error');
    }
  };

  const toggleRevealResult = (giverId) => {
    setRevealedResults(prev => ({
      ...prev,
      [giverId]: !prev[giverId]
    }));
  };

  const revealAllResults = () => {
    const allRevealed = {};
    participants.forEach(p => {
      allRevealed[p.id] = true;
    });
    setRevealedResults(allRevealed);
  };

  const hideAllResults = () => {
    setRevealedResults({});
  };

  const clearAllData = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar TODOS los intercambios? Esta acción no se puede deshacer.')) {
      try {
        await remove(ref(database, 'exchanges'));
        setExchanges([]);
        setCurrentExchangeId(null);
        setParticipants([]);
        setExclusions({});
        setDrawResults(null);
        setRevealedResults({});
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
        {/* Selector de intercambios */}
        <div className="exchanges-section">
          <h2>🎁 Intercambios</h2>
          <div className="form-group">
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={newExchangeName}
                onChange={(e) => setNewExchangeName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createExchange()}
                placeholder="Nombre del nuevo intercambio"
                style={{ flex: 1 }}
              />
              <button onClick={createExchange} className="btn btn-primary">
                ➕ Crear Intercambio
              </button>
            </div>
          </div>

          {exchanges.length === 0 ? (
            <div className="message message-info">
              🎅 No hay intercambios. Crea uno para comenzar.
            </div>
          ) : (
            <div className="exchanges-grid">
              {exchanges.map((exchange) => (
                <div
                  key={exchange.id}
                  className={`exchange-card ${currentExchangeId === exchange.id ? 'active' : ''}`}
                  onClick={() => setCurrentExchangeId(exchange.id)}
                >
                  <h3>🎁 {exchange.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#666' }}>
                    {new Date(exchange.createdAt).toLocaleDateString()}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteExchange(exchange.id);
                    }}
                    className="btn btn-danger btn-sm"
                    style={{ marginTop: '10px' }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel de gestión del intercambio actual */}
        {currentExchangeId && (
          <>
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
                    <div className="message message-warning" style={{ marginBottom: '20px' }}>
                      ⚠️ Cada persona debe tener al menos un participante disponible (sin excluir)
                    </div>
                    {participants.map((giver) => {
                      const excluded = exclusions[giver.id] || [];
                      const otherParticipants = participants.filter(p => p.id !== giver.id);
                      const canExcludeMore = excluded.length < otherParticipants.length - 1;
                      
                      return (
                        <div key={giver.id} className="exclusion-item">
                          <h3>🎅 {giver.name} NO puede darle regalo a:</h3>
                          <div className="checkbox-group">
                            {otherParticipants.map((receiver) => {
                              const isExcluded = excluded.includes(receiver.id);
                              const isDisabled = !isExcluded && !canExcludeMore;
                              
                              return (
                                <label 
                                  key={receiver.id} 
                                  className={`checkbox-label ${isDisabled ? 'disabled' : ''}`}
                                  title={isDisabled ? 'Debes dejar al menos un participante disponible' : ''}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isExcluded}
                                    onChange={() => toggleExclusion(giver.id, receiver.id)}
                                    disabled={isDisabled}
                                  />
                                  {receiver.name}
                                </label>
                              );
                            })}
                          </div>
                          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '10px' }}>
                            Disponibles: {otherParticipants.length - excluded.length} / {otherParticipants.length}
                          </p>
                        </div>
                      );
                    })}
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
                    <div className="results-actions" style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button onClick={revealAllResults} className="btn btn-secondary">
                        👁️ Mostrar Todos
                      </button>
                      <button onClick={hideAllResults} className="btn btn-secondary">
                        🔒 Ocultar Todos
                      </button>
                    </div>
                    {participants.map((giver) => {
                      const receiverId = drawResults[giver.id];
                      const receiver = participants.find(p => p.id === receiverId);
                      const isRevealed = revealedResults[giver.id];
                      
                      return receiver ? (
                        <div key={giver.id} className="result-card">
                          <span className="giver">🎅 {giver.name}</span>
                          <span className="arrow">🎁 → 🎁</span>
                          <span 
                            className="receiver"
                            style={{ 
                              cursor: 'pointer', 
                              userSelect: 'none',
                              backgroundColor: isRevealed ? 'transparent' : '#f0f0f0',
                              padding: '5px 15px',
                              borderRadius: '5px',
                              transition: 'all 0.3s ease'
                            }}
                            onClick={() => toggleRevealResult(giver.id)}
                            title="Haz clic para revelar/ocultar"
                          >
                            {isRevealed ? `${receiver.name} 🎄` : '******* 🔒'}
                          </span>
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
                🗑️ Eliminar Todos los Intercambios
              </button>
              <button onClick={() => setIsAuthenticated(false)} className="btn btn-secondary">
                🚪 Cerrar Sesión
              </button>
            </div>
          </>
        )}

        {!currentExchangeId && exchanges.length === 0 && (
          <div className="message message-info" style={{ marginTop: '30px' }}>
            👆 Crea tu primer intercambio para comenzar
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
