import DOMPurify from 'dompurify'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { DOMParser as ProseMirrorDOMParser } from 'prosemirror-model'
import { marked } from 'marked'
import './RichTextEditor.css'

// ── Shared display component ───────────────────────────────────────────────────

interface RichTextDisplayProps {
  html: string
  className?: string
}

export function RichTextDisplay({ html, className }: RichTextDisplayProps) {
  let raw: string
  if (!html.trim().startsWith('<') && looksLikeMarkdown(html)) {
    // Plain markdown text — convert to HTML for display
    raw = marked.parse(html) as string
  } else {
    raw = html.trim().startsWith('<') ? html : `<p>${html}</p>`
  }
  const safe = DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
  return (
    <div
      className={`tiptap-prose text-sm text-gray-400 leading-relaxed ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}

// ── Editor ─────────────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  minRows?: number
}

function btn(active: boolean) {
  return `px-2 py-1 rounded text-xs font-medium transition-colors select-none ${
    active ? 'bg-indigo-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
  }`
}

// Returns true if text contains common markdown patterns
function looksLikeMarkdown(text: string): boolean {
  return /^#{1,6}\s|^\s*[-*+]\s|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|^\s*>\s|^\s*\d+\.\s|\[.+\]\(.+\)/m.test(text)
}

export function RichTextEditor({ content, onChange, placeholder, minRows = 6 }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? 'Write something…' }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain') ?? ''
        if (!text || !looksLikeMarkdown(text)) return false
        event.preventDefault()
        const htmlStr = DOMPurify.sanitize(marked.parse(text) as string, { USE_PROFILES: { html: true } })
        const wrapper = document.createElement('div')
        wrapper.innerHTML = htmlStr
        const parser = ProseMirrorDOMParser.fromSchema(view.state.schema)
        const slice = parser.parseSlice(wrapper)
        view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView())
        return true
      },
    },
  })

  if (!editor) return null

  const editorStyle = { minHeight: `${minRows * 1.5}rem` }

  return (
    <div className="bg-gray-700 border border-gray-600 rounded-lg focus-within:border-indigo-500 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-600 bg-gray-800">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}>
          <strong>B</strong>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))}>
          <em>I</em>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive('strike'))}>
          <span className="line-through">S</span>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive('code'))}>
          <code className="text-[11px]">`c`</code>
        </button>

        <span className="w-px h-4 bg-gray-600 mx-1 shrink-0" />

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))}>
          H2
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive('heading', { level: 3 }))}>
          H3
        </button>

        <span className="w-px h-4 bg-gray-600 mx-1 shrink-0" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}>
          • List
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))}>
          1. List
        </button>

        <span className="w-px h-4 bg-gray-600 mx-1 shrink-0" />

        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))}>
          ❝
        </button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)}>
          ─
        </button>

        <span className="w-px h-4 bg-gray-600 mx-1 shrink-0" />

        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={btn(false) + ' disabled:opacity-30'} title="Undo">
          ↩
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={btn(false) + ' disabled:opacity-30'} title="Redo">
          ↪
        </button>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="px-3 py-2 text-sm text-white"
        style={editorStyle}
      />
    </div>
  )
}
