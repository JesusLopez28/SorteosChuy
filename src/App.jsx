import { useState, useEffect } from 'react';
import { database } from './firebase';
import { ref, set, get, remove, push } from 'firebase/database';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('exchanges');
  
  // Sistema de múltiples intercambios
  const [exchanges, setExchanges] = useState([]);
  const [currentExchangeId, setCurrentExchangeId] = useState(null);
  const [newExchangeName, setNewExchangeName] = useState('');
  
  // Datos del intercambio actual
  const [participants, setParticipants] = useState([]);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [bulkParticipantText, setBulkParticipantText] = useState(''); // NUEVO estado para textarea
  const [exclusions, setExclusions] = useState({});
  const [drawResults, setDrawResults] = useState(null);
  
  // Revelar resultados individuales (temporal, solo en sesión)
  const [revealedResults, setRevealedResults] = useState({});
  // Campo revelado permanente en Firebase
  const [reveladoStatus, setReveladoStatus] = useState({});
  
  // Estado para deseos de participantes
  const [participantWishes, setParticipantWishes] = useState({});
  
  const [message, setMessage] = useState({ text: '', type: '' });

  // Estado para el modal de confirmación
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    message: '',
    onConfirm: null,
    onCancel: null,
  });

  // Estado para el modal de "Excluir todos menos uno"
  const [excludeModal, setExcludeModal] = useState({
    open: false,
    giverId: null,
    options: [],
    selectedId: '',
    onConfirm: null,
    onCancel: null,
  });

  // NUEVO estado para animación de link copiado
  const [linkCopied, setLinkCopied] = useState(false);

  // Función para mostrar el modal de confirmación
  const showConfirm = (message, onConfirm, onCancel) => {
    setConfirmModal({
      open: true,
      message,
      onConfirm: () => {
        setConfirmModal({ ...confirmModal, open: false });
        onConfirm && onConfirm();
      },
      onCancel: () => {
        setConfirmModal({ ...confirmModal, open: false });
        onCancel && onCancel();
      },
    });
  };

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
        setReveladoStatus(data.revelado || {});
        setParticipantWishes(data.wishes || {});
      } else {
        setParticipants([]);
        setExclusions({});
        setDrawResults(null);
        setRevealedResults({});
        setReveladoStatus({});
        setParticipantWishes({});
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
    showConfirm(
      '¿Estás seguro de eliminar este intercambio? Se perderán todos sus datos.',
      async () => {
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
    );
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      showMessage('Por favor ingresa una contraseña', 'error');
      return;
    }

    try {
      // Verificar contraseña en Firebase
      const passwordRef = ref(database, 'config/adminPassword');
      const snapshot = await get(passwordRef);
      
      let storedPassword = snapshot.val();
      
      // Si no existe contraseña en Firebase, establecer la contraseña por defecto
      if (!storedPassword) {
        storedPassword = 'Chuy2804!';
        await set(passwordRef, storedPassword);
        showMessage('Contraseña inicial configurada en Firebase', 'info');
      }
      
      // Verificar si la contraseña ingresada es correcta
      if (password === storedPassword) {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
        setPassword('');
        showMessage('¡Bienvenido, Chuy!', 'success');
      } else {
        showMessage('Contraseña incorrecta', 'error');
      }
    } catch (error) {
      showMessage('Error al verificar contraseña: ' + error.message, 'error');
      console.error('Error de autenticación:', error);
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

  // NUEVA función para agregar múltiples participantes desde textarea
  const addBulkParticipants = async () => {
    if (!currentExchangeId) {
      showMessage('Selecciona o crea un intercambio primero', 'error');
      return;
    }
    const names = bulkParticipantText
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (names.length === 0) {
      showMessage('No hay nombres válidos para agregar', 'error');
      return;
    }

    try {
      const participantsRef = ref(database, `exchanges/${currentExchangeId}/participants`);
      const newParticipants = [];
      for (const name of names) {
        const newParticipantRef = push(participantsRef);
        await set(newParticipantRef, name);
        newParticipants.push({ id: newParticipantRef.key, name });
      }
      setParticipants([...participants, ...newParticipants]);
      setBulkParticipantText('');
      showMessage(`Se agregaron ${newParticipants.length} participantes`, 'success');
    } catch (error) {
      showMessage('Error al agregar participantes: ' + error.message, 'error');
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

  const deleteParticipantWishes = (participantId) => {
    const participant = participants.find(p => p.id === participantId);

    showConfirm(
      `¿Estás seguro de eliminar todos los deseos de ${participant?.name || 'este participante'}?`,
      async () => {
        try {
          await remove(ref(database, `exchanges/${currentExchangeId}/wishes/${participantId}`));

          const updatedWishes = { ...participantWishes };
          delete updatedWishes[participantId];
          setParticipantWishes(updatedWishes);
          showMessage('Lista de deseos eliminada', 'success');
        } catch (error) {
          showMessage('Error al eliminar la lista de deseos: ' + error.message, 'error');
        }
      }
    );
  };

  const deleteAllWishes = () => {
    showConfirm(
      '¿Estás seguro de eliminar todas las listas de deseos de este intercambio?',
      async () => {
        try {
          await remove(ref(database, `exchanges/${currentExchangeId}/wishes`));
          setParticipantWishes({});
          showMessage('Todas las listas de deseos fueron eliminadas', 'success');
        } catch (error) {
          showMessage('Error al eliminar todas las listas de deseos: ' + error.message, 'error');
        }
      }
    );
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

  // Función para excluir a todos menos a uno específico (ahora solo lógica, sin prompt/confirm)
  const excludeAllExceptOne = async (giverId, winnerId) => {
    const otherParticipants = participants.filter(p => p.id !== giverId);

    if (otherParticipants.length < 1) {
      showMessage('No hay suficientes participantes', 'error');
      return;
    }

    // Crear array con todos los IDs excepto el ganador
    const newExclusions = { ...exclusions };
    newExclusions[giverId] = otherParticipants
      .filter(p => p.id !== winnerId)
      .map(p => p.id);

    try {
      await set(ref(database, `exchanges/${currentExchangeId}/exclusions`), newExclusions);
      setExclusions(newExclusions);
      const winnerName = participants.find(p => p.id === winnerId)?.name;
      const giverName = participants.find(p => p.id === giverId)?.name;
      showMessage(`✅ ${giverName} ahora solo puede regalarle a ${winnerName}`, 'success');
    } catch (error) {
      showMessage('Error al actualizar exclusiones: ' + error.message, 'error');
    }
  };

  // Función para realizar el sorteo
  const performDraw = async () => {
    if (participants.length < 2) {
      showMessage('Se necesitan al menos 2 participantes', 'error');
      return;
    }

    try {
      const result = generateDrawImproved();
      if (result) {
        await set(ref(database, `exchanges/${currentExchangeId}/drawResults`), result);
        // Limpiar estado de revelado al hacer nuevo sorteo
        await set(ref(database, `exchanges/${currentExchangeId}/revelado`), {});
        setDrawResults(result);
        setRevealedResults({});
        setReveladoStatus({});
        setActiveTab('results');
        showMessage('¡Sorteo realizado exitosamente!', 'success');
      } else {
        showMessage('No se pudo realizar el sorteo con las exclusiones actuales. Intenta modificarlas.', 'error');
      }
    } catch (error) {
      showMessage('Error al realizar sorteo: ' + error.message, 'error');
    }
  };

  // Algoritmo robusto de sorteo con backtracking inteligente y aleatoriedad real
  const generateDrawImproved = () => {
    // Validación previa: verificar que hay solución posible
    if (!validateSolutionExists()) {
      return null;
    }

    // Algoritmo de backtracking con aleatorización
    const givers = [...participants];
    
    // Aleatorizar el orden de los givers para añadir imprevisibilidad
    shuffleArray(givers);
    
    const assignments = {};
    const used = new Set();
    
    // Función recursiva de backtracking
    const backtrack = (index) => {
      if (index === givers.length) {
        return true; // Todos asignados exitosamente
      }
      
      const giver = givers[index];
      const excluded = exclusions[giver.id] || [];
      
      // Obtener receptores válidos
      let validReceivers = participants.filter(p => 
        p.id !== giver.id && 
        !excluded.includes(p.id) && 
        !used.has(p.id)
      );
      
      // Si no hay receptores válidos, retroceder
      if (validReceivers.length === 0) {
        return false;
      }
      
      // Aleatorizar el orden de prueba de receptores
      shuffleArray(validReceivers);
      
      // Intentar asignar cada receptor válido
      for (const receiver of validReceivers) {
        // Verificar que esta asignación no causa un deadlock futuro
        if (wouldCauseDeadlock(giver, receiver, index, assignments, used, givers)) {
          continue;
        }
        
        // Hacer la asignación
        assignments[giver.id] = receiver.id;
        used.add(receiver.id);
        
        // Intentar completar el resto
        if (backtrack(index + 1)) {
          return true;
        }
        
        // Deshacer asignación si no funcionó
        delete assignments[giver.id];
        used.delete(receiver.id);
      }
      
      return false; // No se encontró solución en esta rama
    };
    
    // Ejecutar backtracking
    if (backtrack(0)) {
      return assignments;
    }
    
    return null;
  };

  // Función auxiliar: Fisher-Yates shuffle para aleatorización real
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  // Validar que existe al menos una solución posible
  const validateSolutionExists = () => {
    // Verificar que cada participante tiene al menos una opción válida
    for (const giver of participants) {
      const excluded = exclusions[giver.id] || [];
      const validReceivers = participants.filter(p => 
        p.id !== giver.id && 
        !excluded.includes(p.id)
      );
      
      if (validReceivers.length === 0) {
        return false;
      }
    }
    
    // Usar algoritmo de Hall (Marriage Theorem) para grafos bipartitos
    // Si todos los subconjuntos cumplen la condición de Hall, existe emparejamiento perfecto
    return checkHallCondition();
  };

  // Verificar condición de Hall para emparejamiento perfecto
  const checkHallCondition = () => {
    // Para cada subconjunto de participantes, verificar que el conjunto
    // de receptores válidos sea al menos del mismo tamaño
    const n = participants.length;
    
    // Generar todos los subconjuntos no vacíos (2^n - 1)
    for (let mask = 1; mask < (1 << n); mask++) {
      const subset = [];
      const validReceivers = new Set();
      
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          const giver = participants[i];
          subset.push(giver);
          
          // Añadir receptores válidos para este giver
          const excluded = exclusions[giver.id] || [];
          participants.forEach(p => {
            if (p.id !== giver.id && !excluded.includes(p.id)) {
              validReceivers.add(p.id);
            }
          });
        }
      }
      
      // Verificar condición de Hall: |N(S)| >= |S|
      if (validReceivers.size < subset.length) {
        return false;
      }
    }
    
    return true;
  };

  // Verificar si una asignación causaría un deadlock en pasos futuros
  const wouldCauseDeadlock = (giver, receiver, currentIndex, assignments, used, givers) => {
    // Simular la asignación temporalmente
    const tempAssignments = { ...assignments, [giver.id]: receiver.id };
    const tempUsed = new Set([...used, receiver.id]);
    
    // Verificar que los participantes restantes tengan opciones
    for (let i = currentIndex + 1; i < givers.length; i++) {
      const futureGiver = givers[i];
      const excluded = exclusions[futureGiver.id] || [];
      
      const availableReceivers = participants.filter(p => 
        p.id !== futureGiver.id && 
        !excluded.includes(p.id) && 
        !tempUsed.has(p.id)
      );
      
      // Si algún participante futuro se queda sin opciones, hay deadlock
      if (availableReceivers.length === 0) {
        return true;
      }
    }
    
    return false;
  };

  const clearResults = async () => {
    try {
      await remove(ref(database, `exchanges/${currentExchangeId}/drawResults`));
      await remove(ref(database, `exchanges/${currentExchangeId}/revelado`));
      setDrawResults(null);
      setRevealedResults({});
      setReveladoStatus({});
      showMessage('Resultados eliminados', 'success');
    } catch (error) {
      showMessage('Error al eliminar resultados: ' + error.message, 'error');
    }
  };

  const toggleRevealResult = (giverId) => {
    // Solo cambia el estado local de revelado en la sesión actual
    setRevealedResults(prev => ({
      ...prev,
      [giverId]: !prev[giverId]
    }));
    // No modifica reveladoStatus ni actualiza Firebase
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
    showConfirm(
      '¿Estás seguro de que quieres eliminar TODOS los intercambios? Esta acción no se puede deshacer.',
      async () => {
        try {
          await remove(ref(database, 'exchanges'));
          setExchanges([]);
          setCurrentExchangeId(null);
          setParticipants([]);
          setExclusions({});
          setDrawResults(null);
          setRevealedResults({});
          setReveladoStatus({});
          showMessage('Todos los datos han sido eliminados', 'success');
        } catch (error) {
          showMessage('Error al eliminar datos: ' + error.message, 'error');
        }
      }
    );
  };

  // Abrir el modal de excluir todos menos uno
  const openExcludeModal = (giverId) => {
    const otherParticipants = participants.filter(p => p.id !== giverId);
    setExcludeModal({
      open: true,
      giverId,
      options: otherParticipants,
      selectedId: otherParticipants.length > 0 ? otherParticipants[0].id : '',
      onConfirm: async (selectedId) => {
        await excludeAllExceptOne(giverId, selectedId);
        setExcludeModal(prev => ({ ...prev, open: false }));
      },
      onCancel: () => setExcludeModal(prev => ({ ...prev, open: false })),
    });
  };

  // Limpiar todas las exclusiones para una persona
  const clearAllExclusionsForPerson = async (giverId) => {
    const newExclusions = { ...exclusions };
    newExclusions[giverId] = [];
    try {
      await set(ref(database, `exchanges/${currentExchangeId}/exclusions`), newExclusions);
      setExclusions(newExclusions);
    } catch (error) {
      showMessage('Error al eliminar exclusiones: ' + error.message, 'error');
    }
  };

  // Función para generar enlace a lista de deseos pública del participante
  const getPublicWishLink = (participantId) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/view-wishes/${currentExchangeId}?participantId=${participantId}`;
  };

  const openPublicWishView = (participantId) => {
    const link = getPublicWishLink(participantId);
    window.open(link, '_blank');
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
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa la contraseña"
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              🎅 Iniciar Sesión
            </button>
          </form>
          {message.text && (
            <div className={`message message-${message.type}`}>
              <span className="message-icon">{message.type === 'error' ? '❌' : message.type === 'success' ? '✅' : 'ℹ️'}</span>
              <span className="message-text">{message.text}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Modal de confirmación */}
      {confirmModal.open && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <div className="custom-modal-icon">⚠️</div>
            <div className="custom-modal-message">{confirmModal.message}</div>
            <div className="custom-modal-actions">
              <button className="btn btn-danger" onClick={confirmModal.onConfirm}>Sí, confirmar</button>
              <button className="btn btn-secondary" onClick={confirmModal.onCancel}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de excluir todos menos uno */}
      {excludeModal.open && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <div className="custom-modal-icon">🚫</div>
            <div className="custom-modal-message">
              <span>
                <b>
                  ¿A quién quieres que {participants.find(p => p.id === excludeModal.giverId)?.name} le regale a la fuerza?
                </b>
              </span>
              <br />
              <span style={{ fontSize: '0.95rem', color: '#333', marginTop: '10px', display: 'block' }}>
                Se excluirán todos los demás participantes.
              </span>
            </div>
            <div style={{ marginBottom: '25px' }}>
              <select
                className="modal-select" // NUEVA clase para mejorar el estilo
                value={excludeModal.selectedId}
                onChange={e => setExcludeModal({ ...excludeModal, selectedId: e.target.value })}
              >
                {excludeModal.options.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="custom-modal-actions">
              <button
                className="btn btn-danger"
                onClick={() => excludeModal.onConfirm && excludeModal.onConfirm(excludeModal.selectedId)}
              >
                Sí, confirmar
              </button>
              <button
                className="btn btn-secondary"
                onClick={excludeModal.onCancel}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="header">
        <button
          onClick={() => {
            showConfirm(
              '¿Estás seguro de que quieres cerrar sesión?',
              () => {
                setIsAuthenticated(false);
                localStorage.removeItem('isAuthenticated');
                showMessage('Sesión cerrada correctamente', 'success');
              }
            );
          }}
          className="btn-logout"
          title="Cerrar sesión"
        >
          🚪 Cerrar Sesión
        </button>
        <h1>🎄 Sorteos Chuy 🎅</h1>
        <p>✨ Sistema de Amigo Secreto Navideño & Año Nuevo ✨</p>
        <p style={{ marginTop: '10px', fontSize: '1.3rem' }}>🎁 ¡Feliz Navidad y Próspero Año Nuevo! 🎉</p>
      </div>

      {message.text && (
        <div className={`message message-${message.type}`}>
          <span className="message-icon">{message.type === 'error' ? '❌' : message.type === 'success' ? '✅' : message.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
          <span className="message-text">{message.text}</span>
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
              <button
                className={`tab ${activeTab === 'wishes' ? 'active' : ''}`}
                onClick={() => setActiveTab('wishes')}
              >
                📝 Deseos
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
                {/* NUEVO textarea para agregar varios participantes */}
                <div className="form-group" style={{ marginTop: '18px' }}>
                  <label>✍️ Agregar varios participantes (uno por línea)</label>
                  <textarea
                    value={bulkParticipantText}
                    onChange={e => setBulkParticipantText(e.target.value)}
                    placeholder="Escribe un nombre por línea..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      border: '2px solid #e0e0e0',
                      marginBottom: '10px',
                      resize: 'vertical'
                    }}
                  />
                  <button
                    onClick={addBulkParticipants}
                    className="btn btn-primary"
                    disabled={!bulkParticipantText.trim()}
                  >
                    ➕ Agregar Todos
                  </button>
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
                          
                          {/* Botones de acceso rápido */}
                          <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => openExcludeModal(giver.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.85rem' }}
                            >
                              🎯 Excluir todos menos uno...
                            </button>
                            {excluded.length > 0 && (
                              <button
                                onClick={() => clearAllExclusionsForPerson(giver.id)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.85rem' }}
                              >
                                🔄 Limpiar todas las exclusiones
                              </button>
                            )}
                          </div>

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
                                  {excluded.length === otherParticipants.length - 1 && !isExcluded && (
                                    <span style={{ marginLeft: '5px', color: '#28a745', fontWeight: 'bold' }}>
                                      ⭐ (¡Único disponible!)
                                    </span>
                                  )}
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
                    
                    {/* Link para compartir */}
                    <div className="share-link-container">
                      <h3>🔗 Link para Compartir con Participantes</h3>
                      <p style={{ fontSize: '0.95rem', color: '#666', marginBottom: '15px' }}>
                        Comparte este link con tus amigos para que vean sus resultados
                      </p>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '30px', position: 'relative' }}>
                        <input
                          type="text"
                          value={`${window.location.origin}/result/${currentExchangeId}`}
                          readOnly
                          className='input'
                          style={{
                            flex: 1,
                            padding: '12px',
                            border: '2px solid #DAA520',
                            borderRadius: '8px',
                            fontSize: '0.95rem',
                            backgroundColor: '#FFF8DC',
                            fontWeight: '600'
                          }}
                          onClick={(e) => e.target.select()}
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/result/${currentExchangeId}`);
                            setLinkCopied(true);
                            showMessage('¡Link copiado al portapapeles!', 'success');
                            setTimeout(() => setLinkCopied(false), 1200);
                          }}
                          className="btn btn-primary"
                        >
                          📋 Copiar
                        </button>
                        {/* Animación visual de link copiado */}
                        {linkCopied && (
                          <span
                            style={{
                              position: 'absolute',
                              right: '110px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: '#DAA520',
                              color: '#fff',
                              padding: '8px 18px',
                              borderRadius: '12px',
                              fontWeight: 'bold',
                              fontSize: '1rem',
                              boxShadow: '0 2px 8px rgba(218,165,32,0.25)',
                              animation: 'fadeInOut 1.2s'
                            }}
                          >
                            ¡Link copiado!
                          </span>
                        )}
                      </div>
                    </div>

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
                      const haAbiertoAntes = reveladoStatus[giver.id]?.abierto;
                      const timestampAbierto = reveladoStatus[giver.id]?.timestamp;
                      
                      return receiver ? (
                        <div key={giver.id} className="result-card">
                          <span className="giver">
                            🎅 {giver.name}
                            {haAbiertoAntes && (
                              <span 
                                style={{ 
                                  marginLeft: '8px', 
                                  fontSize: '0.85rem', 
                                  color: '#28a745',
                                  fontWeight: 'bold'
                                }}
                                title={`Abierto el ${new Date(timestampAbierto).toLocaleString('es-MX')}`}
                              >
                                ✓ Ya lo abrió
                              </span>
                            )}
                          </span>
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

            {activeTab === 'wishes' && (
              <div>
                <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#2c5f2d' }}>
                  📝 Listas de Deseos de Participantes 🎁
                </h2>
                <div className="actions-bar" style={{ marginBottom: '20px' }}>
                  <button
                    onClick={deleteAllWishes}
                    className="btn btn-danger"
                    disabled={Object.keys(participantWishes).length === 0}
                  >
                    🗑️ Limpiar todos los deseos
                  </button>
                </div>
                
                {participants.length === 0 ? (
                  <div className="message message-info">
                    🎅 No hay participantes registrados
                  </div>
                ) : (
                  <>
                    <div className="message message-info" style={{ marginBottom: '20px' }}>
                      💡 Los participantes pueden agregar sus deseos desde el link de resultados. Aquí puedes ver y descargar las listas.
                    </div>
                    
                    <div className="wishes-admin-grid">
                      {participants.map((participant) => {
                        const wishes = participantWishes[participant.id];
                        const hasWishes = wishes && wishes.items && wishes.items.length > 0;
                        
                        return (
                          <div key={participant.id} className="wish-admin-card">
                            <div className="wish-admin-header">
                              <h3>🎅 {participant.name}</h3>
                              {hasWishes && (
                                <span className="wish-count-badge">
                                  {wishes.items.length} {wishes.items.length === 1 ? 'deseo' : 'deseos'}
                                </span>
                              )}
                            </div>
                            
                            {hasWishes ? (
                              <>
                                <div className="wish-admin-preview">
                                  {wishes.items.slice(0, 3).map((wish, index) => (
                                    <div key={index} className="wish-preview-item">
                                      <span className="wish-preview-number">#{index + 1}</span>
                                      <span className="wish-preview-name">{wish.name}</span>
                                    </div>
                                  ))}
                                  {wishes.items.length > 3 && (
                                    <div className="wish-preview-more">
                                      +{wishes.items.length - 3} más...
                                    </div>
                                  )}
                                </div>
                                
                                <button
                                  onClick={() => openPublicWishView(participant.id)}
                                  className="btn btn-primary"
                                  style={{ width: '100%', marginTop: '15px' }}
                                >
                                  🔗 Ver Lista Pública
                                </button>
                                <button
                                  onClick={() => deleteParticipantWishes(participant.id)}
                                  className="btn btn-danger"
                                  style={{ width: '100%', marginTop: '10px' }}
                                >
                                  🗑️ Eliminar deseos
                                </button>
                              </>
                            ) : (
                              <div className="no-wishes-admin">
                                <p>😔 Aún no ha agregado deseos</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
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
