// Renderer do projetor — recebe dados via IPC e renderiza o slide fullscreen.
// Sem React, apenas vanilla JS para máxima performance e carregamento rápido.

type ProjectorData = {
  lines: string[]
  footer: string
  background: string
  textColor: string
  footerColor: string
  fontSize: number
  footerFontSize: number
  blank: boolean
}

const slideEl = document.getElementById('slide')!
const bodyEl = document.getElementById('body')!
const footerEl = document.getElementById('footer')!

function render(data: ProjectorData): void {
  // Aplica cores e fonte
  slideEl.style.background = data.background
  bodyEl.style.color = data.textColor
  bodyEl.style.fontSize = `${data.fontSize}px`
  footerEl.style.color = data.footerColor
  footerEl.style.fontSize = `${data.footerFontSize}px`

  // Renderiza linhas da letra
  bodyEl.innerHTML = data.lines
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join('')

  // Renderiza rodapé
  footerEl.textContent = data.footer

  // Tela preta
  if (data.blank) {
    slideEl.classList.add('blank')
  } else {
    slideEl.classList.remove('blank')
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Escuta atualizações do main process
window.holy.projector.onUpdate((_event, data: ProjectorData) => {
  render(data)
})

// Sinaliza que o projetor está pronto
window.holy.projector.ready()
