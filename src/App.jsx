import { useState } from 'react'
import './App.css'

function App() {
  const [images, setImages] = useState([])

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files)
    const newImages = files.map(file => URL.createObjectURL(file))
    setImages(prevImages => [...prevImages, ...newImages])
  }

  return (
    <div className="app-container">
      <h1>ALV Immobilier - Watermark Tool</h1>
      
      <div className="upload-section">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="file-input"
        />
      </div>

      <div className="images-grid">
        {images.map((image, index) => (
          <div key={index} className="image-container">
            <img src={image} alt={`Image ${index + 1}`} className="property-image" />
            <div className="watermark">
              <img src="/logo.png" alt="Logo ALV Immobilier" className="logo" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App 