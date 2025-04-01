import { useState, useRef, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import JSZip from 'jszip'
import './App.css'

function App() {
  const [images, setImages] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [isDownloading, setIsDownloading] = useState({})
  const [editingName, setEditingName] = useState(null)
  const [newName, setNewName] = useState('')
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'))
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  const handleFiles = (files) => {
    const newImages = files.map(file => {
      // Nettoyer le nom du fichier
      const cleanName = file.name
        .replace(/vite|react/gi, '') // Supprimer "vite" et "react" du nom
        .replace(/[_-]/g, ' ') // Remplacer les tirets et underscores par des espaces
        .replace(/\s+/g, ' ') // Supprimer les espaces multiples
        .trim(); // Supprimer les espaces au début et à la fin

      return {
        url: URL.createObjectURL(file),
        name: cleanName || 'Image', // Utiliser 'Image' si le nom est vide
        file: file
      }
    })
    setImages(prevImages => [...prevImages, ...newImages])
  }

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files)
    handleFiles(files)
  }

  const handleDownload = async (imageUrl) => {
    try {
      // Créer un canvas pour le traitement de l'image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Charger l'image principale
      const img = new Image();
      const imageLoadPromise = new Promise((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          resolve();
        };
        img.onerror = reject;
      });
      img.src = imageUrl;
      await imageLoadPromise;

      // Charger le logo
      const logo = new Image();
      const logoLoadPromise = new Promise((resolve, reject) => {
        logo.onload = () => {
          const logoWidth = canvas.width * 0.2;
          const logoHeight = (logo.height / logo.width) * logoWidth;
          const x = (canvas.width - logoWidth) / 2;
          const y = (canvas.height - logoHeight) / 2;
          ctx.globalAlpha = 0.3;
          ctx.drawImage(logo, x, y, logoWidth, logoHeight);
          resolve();
        };
        logo.onerror = reject;
      });
      logo.src = '/logo.png';
      await logoLoadPromise;

      // Convertir le canvas en blob
      return new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });
    } catch (error) {
      console.error('Erreur lors du traitement de l\'image:', error);
      return null;
    }
  };

  const handleDownloadSingle = async (imageUrl, imageName, index) => {
    // Vérifier si un téléchargement est déjà en cours pour cette image
    if (isDownloading[index]) return;

    try {
      // Marquer le début du téléchargement
      setIsDownloading(prev => ({ ...prev, [index]: true }));

      const blob = await handleDownload(imageUrl);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        // Utiliser le nom personnalisé de l'image, ou un nom par défaut si vide
        const fileName = imageName.trim() || `image-alv-${index + 1}.jpg`;
        link.download = fileName;
        link.click();
        
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          // Réinitialiser l'état de téléchargement après 1 seconde
          setTimeout(() => {
            setIsDownloading(prev => ({ ...prev, [index]: false }));
          }, 1000);
        }, 100);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      // Réinitialiser l'état en cas d'erreur
      setIsDownloading(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleDownloadAll = async () => {
    // Vérifier si un téléchargement global est déjà en cours
    if (isDownloading.all) return;

    try {
      // Marquer le début du téléchargement global
      setIsDownloading(prev => ({ ...prev, all: true }));

      const zip = new JSZip();
      const imgFolder = zip.folder("images-alv");
      
      for (let i = 0; i < images.length; i++) {
        const blob = await handleDownload(images[i].url);
        if (blob) {
          // Utiliser le nom personnalisé de l'image, ou un nom par défaut si vide
          const fileName = images[i].name.trim() || `image-${i + 1}.jpg`;
          imgFolder.file(fileName, blob);
        }
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      const blobUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'images-alv.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      // Réinitialiser l'état de téléchargement global après 1 seconde
      setTimeout(() => {
        setIsDownloading(prev => ({ ...prev, all: false }));
      }, 1000);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      // Réinitialiser l'état en cas d'erreur
      setIsDownloading(prev => ({ ...prev, all: false }));
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages(prevImages => {
      URL.revokeObjectURL(prevImages[indexToRemove].url)
      return prevImages.filter((_, index) => index !== indexToRemove)
    })
  }

  const handleRemoveAll = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer toutes les images ? Cette action est irréversible.')) {
      setImages([]);
      setMainContentClass('no-images');
    }
  };

  const handleRenameStart = (index, currentName) => {
    setEditingName(index)
    setNewName(currentName)
  }

  const handleRenameSubmit = (index) => {
    if (newName.trim()) {
      setImages(prevImages => {
        const newImages = [...prevImages]
        newImages[index] = {
          ...newImages[index],
          name: newName.trim()
        }
        return newImages
      })
      setEditingName(null)
    }
  }

  const handleRenameKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(index)
    } else if (e.key === 'Escape') {
      setEditingName(null)
    }
  }

  useEffect(() => {
    return () => {
      images.forEach(image => {
        URL.revokeObjectURL(image.url)
      })
    }
  }, [])

  return (
    <div 
      className={`app-container ${isDragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!isDragging) setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        // Vérifier si on quitte réellement la zone de l'application
        const rect = e.currentTarget.getBoundingClientRect();
        if (
          e.clientX <= rect.left ||
          e.clientX >= rect.right ||
          e.clientY <= rect.top ||
          e.clientY >= rect.bottom
        ) {
          setIsDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        if (files.length > 0) {
          handleFiles(files);
        }
      }}
    >
      <main className={`main-content ${images.length === 0 ? 'no-images' : 'has-images'}`}>
        <div 
          className={`upload-zone ${isDragging ? 'dragging' : ''}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <div className="upload-message">
            <div className="header-logos">
              <img src="/vite.svg" className="tech-logo" alt="Vite logo" />
              <img src="/react.svg" className="tech-logo react" alt="React logo" />
            </div>
            <p>Glissez-déposez vos photos ici</p>
            <p className="upload-hint">ou cliquez pour sélectionner</p>
          </div>
        </div>

        {images.length > 0 && (
          <div className="preview-zone">
            <div className="preview-header">
              <button 
                className="remove-all-button"
                onClick={handleRemoveAll}
                title="Supprimer toutes les images"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
              <button 
                className={`download-all-button ${isDownloading.all ? 'downloading' : ''}`} 
                onClick={handleDownloadAll}
                disabled={isDownloading.all}
              >
                {isDownloading.all ? 'Téléchargement...' : `Télécharger toutes les images (${images.length})`}
              </button>
            </div>
            <div className="images-grid">
              {images.map((image, index) => (
                <div key={index} className="image-container">
                  <img src={image.url} alt={`Image ${index + 1}`} className="property-image" />
                  <div className="watermark">
                    <img src="/logo.png" alt="Logo ALV Immobilier" className="logo" />
                  </div>
                  <div className="image-info">
                    {editingName === index ? (
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onBlur={() => handleRenameSubmit(index)}
                        onKeyDown={(e) => handleRenameKeyDown(e, index)}
                        autoFocus
                        className="rename-input"
                      />
                    ) : (
                      <span onClick={() => handleRenameStart(index, image.name)} className="image-name">
                        {image.name}
                      </span>
                    )}
      </div>
                  <div className="image-actions">
                    <button 
                      className={`download-button ${isDownloading[index] ? 'downloading' : ''}`}
                      onClick={() => handleDownloadSingle(image.url, image.name, index)}
                      disabled={isDownloading[index]}
                      title="Télécharger cette image"
                    >
                      {isDownloading[index] ? '•' : '↓'}
                    </button>
                    <button 
                      className="remove-button"
                      onClick={() => handleRemoveImage(index)}
                      title="Supprimer cette image"
                    >
                      ×
        </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      </div>
  )
}

export default App

