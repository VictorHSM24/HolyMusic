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

// ---- Exportação de setlist (múltiplas músicas num único PPTX) ----

export type SetlistEntry = {
  song: string
  author: string
  slides: Slide[]
}

export type SetlistExportParams = {
  entries: SetlistEntry[]
  theme: SlideTheme
  outputPath: string
  /** Título do culto/evento (opcional, aparece no slide de abertura) */
  eventTitle?: string
}

function addLyricSlides(
  pptx: pptxgen,
  entry: SetlistEntry,
  theme: SlideTheme
): void {
  const footerText = theme.uppercaseFooter
    ? `${entry.song} — ${entry.author}`.toUpperCase()
    : `${entry.song} — ${entry.author}`

  // Slide de título da música
  const titleSlide = pptx.addSlide()
  titleSlide.background = { color: theme.background.replace('#', '') }
  const titleText = theme.uppercaseLyrics ? entry.song.toUpperCase() : entry.song
  titleSlide.addText(titleText, {
    x: 0.5,
    y: 2.5,
    w: 12.333,
    h: 1.5,
    align: 'center',
    valign: 'middle',
    fontSize: theme.fontSize + 8,
    color: theme.textColor.replace('#', ''),
    bold: true,
    fontFace: 'Calibri'
  })
  const authorText = theme.uppercaseFooter
    ? entry.author.toUpperCase()
    : entry.author
  titleSlide.addText(authorText, {
    x: 0.5,
    y: 4.2,
    w: 12.333,
    h: 0.8,
    align: 'center',
    valign: 'middle',
    fontSize: theme.footerFontSize + 4,
    color: theme.footerColor.replace('#', ''),
    italic: true,
    fontFace: 'Calibri'
  })

  // Slides da letra
  for (const slide of entry.slides) {
    const s = pptx.addSlide()
    s.background = { color: theme.background.replace('#', '') }

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
}

export async function exportSetlistPptx(
  params: SetlistExportParams
): Promise<{ path: string }> {
  const { entries, theme, outputPath, eventTitle } = params

  const pptx = new pptxgen()
  pptx.defineLayout({ name: 'HolyMusic16x9', width: 13.333, height: 7.5 })
  pptx.layout = 'HolyMusic16x9'
  pptx.author = 'HolyMusic'
  pptx.title = eventTitle || 'Setlist HolyMusic'

  // Slide de abertura (opcional)
  if (eventTitle) {
    const cover = pptx.addSlide()
    cover.background = { color: theme.background.replace('#', '') }
    cover.addText(eventTitle, {
      x: 0.5,
      y: 2.8,
      w: 12.333,
      h: 2.0,
      align: 'center',
      valign: 'middle',
      fontSize: 54,
      color: theme.textColor.replace('#', ''),
      bold: true,
      fontFace: 'Calibri'
    })
  }

  for (const entry of entries) {
    addLyricSlides(pptx, entry, theme)
  }

  const outPath = outputPath.endsWith('.pptx') ? outputPath : `${outputPath}.pptx`
  await pptx.writeFile({ fileName: outPath })
  return { path: outPath }
}
