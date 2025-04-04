import { useState, useRef } from 'react'
import JSZip from 'jszip'
import './App.css'

function App() {
  const [images, setImages] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [mainContentClass, setMainContentClass] = useState('no-images')
  const [isDownloading, setIsDownloading] = useState({})
  const [editingName, setEditingName] = useState(null)
  const [newName, setNewName] = useState('')
  const [watermarkType, setWatermarkType] = useState('pattern') // 'pattern', 'center', 'corner'
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
    handleFiles(files)
  }

  const handleFiles = (files) => {
    const newImages = files.map(file => {
      const cleanName = file.name
        .replace(/vite|react/gi, '')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      return {
        url: URL.createObjectURL(file),
        name: cleanName || 'Image',
        file: file
      }
    })
    setImages(prevImages => [...prevImages, ...newImages])
    setMainContentClass('has-images')
  }

  const handleFileInput = () => {
    fileInputRef.current.click()
  }

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'))
    handleFiles(files)
    e.target.value = null
  }

  const handleRemoveImage = (index) => {
    URL.revokeObjectURL(images[index].url)
    setImages(prevImages => {
      const newImages = [...prevImages]
      newImages.splice(index, 1)
      if (newImages.length === 0) {
        setMainContentClass('no-images')
      }
      return newImages
    })
  }

  const handleRemoveAll = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer toutes les images ? Cette action est irréversible.')) {
      images.forEach(image => URL.revokeObjectURL(image.url))
      setImages([])
      setMainContentClass('no-images')
    }
  }

  const createImageWithWatermark = async (imageUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const logo = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.drawImage(img, 0, 0);
        
        logo.onload = () => {
          switch(watermarkType) {
            case 'pattern':
              // Taille du logo (environ 15% de la largeur de l'image)
              const logoWidth = img.width * 0.15;
              const logoHeight = (logoWidth * logo.height) / logo.width;
              
              // Espacement entre les logos
              const spacingX = logoWidth * 2;
              const spacingY = logoHeight * 1.5;
              
              // Rotation de 30 degrés
              const angle = -30 * Math.PI / 180;
              
              // Appliquer les logos en motif
              let rowIndex = 0;
              for (let y = -logoHeight * 2; y < img.height + logoHeight; y += spacingY) {
                const offsetX = (rowIndex % 2) * (spacingX / 2);
                for (let x = -logoWidth * 2; x < img.width + logoWidth * 2; x += spacingX) {
                  ctx.save();
                  ctx.translate(x + offsetX + logoWidth/2, y + logoHeight/2);
                  ctx.rotate(angle);
                  ctx.globalAlpha = 0.85;
                  ctx.drawImage(logo, -logoWidth/2, -logoHeight/2, logoWidth, logoHeight);
                  ctx.restore();
                }
                rowIndex++;
              }
              break;

            case 'center':
              const centerLogoWidth = img.width * 0.25; // Réduit de 40% à 25%
              const centerLogoHeight = (centerLogoWidth * logo.height) / logo.width;
              const centerX = (img.width - centerLogoWidth) / 2;
              const centerY = (img.height - centerLogoHeight) / 2;
              
              ctx.globalAlpha = 0.3; // Plus transparent
              ctx.drawImage(logo, centerX, centerY, centerLogoWidth, centerLogoHeight);
              break;

            case 'corner':
              const cornerLogoWidth = img.width * 0.45;
              const cornerLogoHeight = (cornerLogoWidth * logo.height) / logo.width;
              const cornerX = img.width - cornerLogoWidth - (img.width * 0.01);
              const cornerY = img.height - cornerLogoHeight;
              
              ctx.globalAlpha = 1; // Opacité à 100%
              ctx.drawImage(logo, cornerX, cornerY, cornerLogoWidth, cornerLogoHeight);
              break;
          }
          
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.9);
        };
        
        logo.onerror = reject;
        const logoPath = watermarkType === 'center' ? '/alv-immobilier-filigram/logo.png' : '/alv-immobilier-filigram/ALV.png';
        logo.src = `${logoPath}?v=${Date.now()}`;
      };
      
      img.onerror = reject;
      img.src = imageUrl;
    });
  };

  const handleDownloadSingle = async (imageUrl, imageName, index) => {
    if (isDownloading[index]) return;

    try {
      setIsDownloading(prev => ({ ...prev, [index]: true }));
      
      const blob = await createImageWithWatermark(imageUrl);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        const fileName = imageName.trim() || `image-${index + 1}.jpg`;
        link.download = fileName;
        link.click();
        
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          setTimeout(() => {
            setIsDownloading(prev => ({ ...prev, [index]: false }));
          }, 1000);
        }, 100);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      setIsDownloading(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleDownloadAll = async () => {
    if (isDownloading.all) return;

    try {
      setIsDownloading(prev => ({ ...prev, all: true }));

      const zip = new JSZip();
      const imgFolder = zip.folder("images-alv");
      
      for (let i = 0; i < images.length; i++) {
        const blob = await createImageWithWatermark(images[i].url);
        if (blob) {
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

      setTimeout(() => {
        setIsDownloading(prev => ({ ...prev, all: false }));
      }, 1000);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      setIsDownloading(prev => ({ ...prev, all: false }));
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

  return (
    <div 
      className={`app-container ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`main-content ${mainContentClass}`}>
        <div className="upload-zone" onClick={handleFileInput}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
            accept="image/*"
            multiple
          />
          <div className="upload-message">
            <div className="tech-logos">
              <img src="/alv-immobilier-filigram/vite.svg" alt="Vite Logo" className="tech-logo vite" />
              <img src="/alv-immobilier-filigram/react.svg" alt="React Logo" className="tech-logo react" />
            </div>
            <p>Glissez et déposez vos images ici</p>
            <p>ou cliquez pour sélectionner</p>
          </div>
        </div>

        {images.length > 0 && (
          <div className="preview-zone">
            <div className="preview-header">
              <select 
                className="watermark-select"
                value={watermarkType}
                onChange={(e) => setWatermarkType(e.target.value)}
              >
                <option value="pattern">Filigrane motif</option>
                <option value="center">Logo centré</option>
                <option value="corner">Logo en bas à droite</option>
              </select>
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
                title="Télécharger toutes les images"
              >
                Télécharger toutes les images ({images.length})
              </button>
            </div>

            <div className="images-grid">
              {images.map((image, index) => (
                <div key={index} className="image-container">
                  <img src={image.url} alt={`Image ${index + 1}`} className="property-image" />
                  <div className={`watermark ${watermarkType}`}>
                    <img 
                      src={watermarkType === 'center' ? '/alv-immobilier-filigram/logo.png' : '/alv-immobilier-filigram/ALV.png'} 
                      alt="Logo ALV Immobilier" 
                      className="logo" 
                    />
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
      </div>
      <div className="copyright">@ALV Immobilier 2025</div>
    </div>
  )
}

export default App
