import { useState, useEffect } from 'react';
import { database } from './firebase';
import { ref, set, get } from 'firebase/database';
import './WishListForm.css';

function WishListForm({ exchangeId, participantId, participantName }) {
  const [wishes, setWishes] = useState([]);
  const [newWish, setNewWish] = useState({
    name: '',
    description: '',
    imageBase64: '',
    purchaseLink: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadWishes();
  }, [exchangeId, participantId]);

  const loadWishes = async () => {
    try {
      const wishesRef = ref(database, `exchanges/${exchangeId}/wishes/${participantId}`);
      const snapshot = await get(wishesRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        setWishes(data.items || []);
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error al cargar deseos:', error);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const saveToFirebase = async (updatedWishes) => {
    try {
      const wishesRef = ref(database, `exchanges/${exchangeId}/wishes/${participantId}`);
      await set(wishesRef, {
        participantName,
        items: updatedWishes,
        updatedAt: Date.now()
      });
      return true;
    } catch (error) {
      console.error('Error al guardar:', error);
      showMessage('Error al guardar: ' + error.message, 'error');
      return false;
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      showMessage('Por favor selecciona un archivo de imagen válido', 'error');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('La imagen es muy grande. Máximo 5MB', 'error');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onloadend = () => {
      setNewWish({ ...newWish, imageBase64: reader.result });
      setIsUploading(false);
      showMessage('Imagen cargada exitosamente', 'success');
    };

    reader.onerror = () => {
      setIsUploading(false);
      showMessage('Error al cargar la imagen', 'error');
    };

    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setNewWish({ ...newWish, imageBase64: '' });
  };

  const addWish = async () => {
    if (!newWish.name.trim()) {
      showMessage('Por favor ingresa el nombre del regalo que deseas', 'error');
      return;
    }

    const updatedWishes = [...wishes, { ...newWish, id: Date.now() }];
    setWishes(updatedWishes);
    
    const saved = await saveToFirebase(updatedWishes);
    if (saved) {
      setNewWish({ name: '', description: '', imageBase64: '', purchaseLink: '' });
      showMessage('✅ Regalo agregado y guardado', 'success');
    }
  };

  const removeWish = async (wishId) => {
    const updatedWishes = wishes.filter(w => w.id !== wishId);
    setWishes(updatedWishes);
    
    const saved = await saveToFirebase(updatedWishes);
    if (saved) {
      showMessage('🗑️ Regalo eliminado', 'info');
    }
  };

  const handleEdit = () => {
    setIsSaved(false);
  };

  return (
    <div className="wishlist-form-container">
      <div className="wishlist-header">
        <h2>🎁 Mi Lista de Deseos 🎅</h2>
        <p>Ayuda a tu amigo secreto a elegir el regalo perfecto para ti</p>
      </div>

      {message.text && (
        <div className={`wishlist-message wishlist-message-${message.type}`}>
          {message.text}
        </div>
      )}

      {isSaved ? (
        <div className="wishlist-saved-view">
          <div className="saved-indicator">
            ✅ Tu lista de deseos ha sido guardada
          </div>
          
          {wishes.length > 0 ? (
            <div className="wishes-display">
              {wishes.map((wish, index) => (
                <div key={wish.id} className="wish-card-display">
                  <div className="wish-number">#{index + 1}</div>
                  <h3>{wish.name}</h3>
                  {wish.description && <p className="wish-description">{wish.description}</p>}
                  {wish.imageBase64 && (
                    <img src={wish.imageBase64} alt={wish.name} className="wish-image" />
                  )}
                  {wish.purchaseLink && (
                    <a 
                      href={wish.purchaseLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="wish-link"
                    >
                      🔗 Ver producto
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-wishes-message">
              No agregaste ningún deseo a tu lista
            </div>
          )}

          <button onClick={handleEdit} className="btn-edit-wishlist">
            ✏️ Editar mi lista
          </button>
        </div>
      ) : (
        <>
          <div className="wishlist-form">
            <h3>➕ Agregar un regalo a mi lista</h3>
            
            <div className="form-field">
              <label>🎁 Nombre del regalo *</label>
              <textarea
                value={newWish.name}
                onChange={(e) => setNewWish({ ...newWish, name: e.target.value })}
                placeholder="Ej: Sudadera Nike talla M, Libro de Harry Potter, AirPods Pro, etc."
                rows={2}
              />
            </div>

            <div className="form-field">
              <label>📝 Descripción (opcional)</label>
              <textarea
                value={newWish.description}
                onChange={(e) => setNewWish({ ...newWish, description: e.target.value })}
                placeholder="Agrega detalles como talla, color, modelo, marca, etc."
                rows={4}
              />
            </div>

            <div className="form-field">
              <label>🖼️ Imagen del producto (opcional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input"
              />
              {isUploading && <p className="upload-status">⏳ Cargando imagen...</p>}
              {newWish.imageBase64 && (
                <div className="image-preview">
                  <img src={newWish.imageBase64} alt="Preview" />
                  <button 
                    type="button" 
                    onClick={removeImage} 
                    className="btn-remove-image"
                  >
                    ❌ Quitar imagen
                  </button>
                </div>
              )}
            </div>

            <div className="form-field">
              <label>🔗 Link de compra (opcional)</label>
              <textarea
                value={newWish.purchaseLink}
                onChange={(e) => setNewWish({ ...newWish, purchaseLink: e.target.value })}
                placeholder="https://tienda.com/producto"
                rows={2}
              />
            </div>

            <button onClick={addWish} className="btn-add-wish">
              ➕ Agregar a mi lista
            </button>
          </div>

          {wishes.length > 0 && (
            <div className="wishes-list">
              <h3>📋 Mi lista de deseos ({wishes.length})</h3>
              {wishes.map((wish, index) => (
                <div key={wish.id} className="wish-item">
                  <div className="wish-item-header">
                    <span className="wish-item-number">#{index + 1}</span>
                    <span className="wish-item-name">{wish.name}</span>
                    <button 
                      onClick={() => removeWish(wish.id)} 
                      className="btn-remove-wish"
                      title="Eliminar"
                    >
                      ❌
                    </button>
                  </div>
                  {wish.description && (
                    <p className="wish-item-description">{wish.description}</p>
                  )}
                  {wish.imageBase64 && (
                    <div className="wish-item-image-preview">
                      <img src={wish.imageBase64} alt={wish.name} />
                    </div>
                  )}
                  {wish.purchaseLink && (
                    <a 
                      href={wish.purchaseLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="wish-item-link"
                    >
                      🔗 Ver en tienda
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {wishes.length === 0 && (
            <div className="empty-wishes-hint">
              <p>💡 Tip: Puedes agregar varios regalos para darle más opciones a tu amigo secreto</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default WishListForm;
