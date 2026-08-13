import pptxgen from 'pptxgenjs'

export type Slide = { lines: string[] }

export type SlideTheme = {
  background: string
  textColor: string
  footerColor: string
  fontSize: number
  footerFontSize: number
  uppercaseLyrics: boolean
  uppercaseFooter: boolean
}

export type ExportParams = {
  slides: Slide[]
  song: string
  author: string
  theme: SlideTheme
  outputPath: string
}

export async function exportPptx(params: ExportParams): Promise<{ path: string }> {
  const { slides, song, author, theme, outputPath } = params

  const pptx = new pptxgen()
  pptx.defineLayout({ name: 'HolyMusic16x9', width: 13.333, height: 7.5 })
  pptx.layout = 'HolyMusic16x9'
  pptx.author = 'HolyMusic'
  pptx.title = `${song} — ${author}`

  const footerText = theme.uppercaseFooter
    ? `${song} — ${author}`.toUpperCase()
    : `${song} — ${author}`

  for (const slide of slides) {
    const s = pptx.addSlide()
    s.background = { color: theme.background.replace('#', '') }

    // Texto principal centralizado vertical e horizontalmente
    const rawBody = slide.lines.join('\n')
    const bodyText = theme.uppercaseLyrics ? rawBody.toUpperCase() : rawBody
    s.addText(bodyText, {
      x: 0.5,
      y: 1.2,
      w: 12.333,
      h: 5.0,
      align: 'center',
      valign: 'middle',
      fontSize: theme.fontSize,
      color: theme.textColor.replace('#', ''),
      bold: false,
      fontFace: 'Calibri',
      lineSpacingMultiple: 1.2,
      breakLine: true
    })

    // Rodapé: música — autor, em fonte menor
    s.addText(footerText, {
      x: 0.5,
      y: 7.05,
      w: 12.333,
      h: 0.35,
      align: 'center',
      valign: 'bottom',
      fontSize: theme.footerFontSize,
      color: theme.footerColor.replace('#', ''),
      italic: true,
      fontFace: 'Calibri'
    })
  }

  const outPath = outputPath.endsWith('.pptx') ? outputPath : `${outputPath}.pptx`
  await pptx.writeFile({ fileName: outPath })
  return { path: outPath }
}
