'use client'

import { useState, useEffect } from 'react'

type FontSize = 'sm' | 'md' | 'lg'
const FS_ZOOM = { sm: '1', md: '1.05', lg: '1.1' }
const FS_LABEL = { sm: 'Nhỏ', md: 'Vừa', lg: 'Lớn' }

export default function FooterControls() {
  const [fontSize, setFontSize] = useState<FontSize>('sm')
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const fs = (localStorage.getItem('lvh_fs') as FontSize) || 'sm'
    const dm = localStorage.getItem('lvh_dark') === '1'
    setFontSize(fs)
    setDarkMode(dm)
    applyDisplay(fs, dm)
  }, [])

  function applyDisplay(fs: FontSize, dm: boolean) {
    const html = document.documentElement
    html.classList.toggle('dark', dm)
    html.style.zoom = FS_ZOOM[fs]
  }

  function pickFont(fs: FontSize) {
    setFontSize(fs)
    localStorage.setItem('lvh_fs', fs)
    applyDisplay(fs, darkMode)
  }

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('lvh_dark', next ? '1' : '0')
    applyDisplay(fontSize, next)
  }

  return (
    <div style={{ display: 'flex', background: '#33322d', borderRadius: 4, overflow: 'hidden', border: '1px solid #4a4842' }}>
      {(['sm','md','lg'] as FontSize[]).map(fs => (
        <button key={fs} 
          style={{ 
            background: fontSize===fs ? '#4a4842' : 'transparent', 
            border: 'none', 
            color: '#f9f8f6', 
            padding: '6px 12px', 
            fontSize: 13, 
            cursor: 'pointer',
            transition: 'background 0.2s'
          }} 
          onClick={()=>pickFont(fs)}>
          {FS_LABEL[fs]}
        </button>
      ))}
      <span style={{ width: 1, background: '#4a4842' }}/>
      <button 
        style={{ background: 'transparent', border: 'none', padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}
        onClick={toggleDark} title={darkMode?'Chế độ sáng':'Chế độ tối'}>
        {darkMode ? '☀️' : '🌙'}
      </button>
    </div>
  )
}
