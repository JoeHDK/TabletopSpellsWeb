import { useState } from 'react'
import DOMPurify from 'dompurify'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { DOMParser as ProseMirrorDOMParser } from 'prosemirror-model'
import { marked } from 'marked'
import './RichTextEditor.css'

// ── Shared display component ───────────────────────────────────────────────────

interface RichTextDisplayProps {
  html: string
  className?: string
}

export function RichTextDisplay({ html, className }: RichTextDisplayProps) {
  const trimmed = html.trim()
  let raw: string
  if (!trimmed) {
    raw = ''
  } else if (!trimmed.startsWith('<')) {
    raw = looksLikeMarkdown(trimmed) ? (marked.parse(trimmed) as string) : `<p>${trimmed}</p>`
  } else {
    const textOnly = trimmed
      .replace(/<\/(p|h[1-6]|li|blockquote|div|tr|td)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim()
    raw = looksLikeMarkdown(textOnly) ? (marked.parse(textOnly) as string) : trimmed
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

function btn(active: boolean, extra = '') {
  return `px-2 py-1 rounded text-xs font-medium transition-colors select-none ${
    active ? 'bg-indigo-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
  } ${extra}`
}

function looksLikeMarkdown(text: string): boolean {
  return /^#{1,6}\s|^\s*[-*+]\s|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|^\s*>\s|^\s*\d+\.\s|\[.+\]\(.+\)/m.test(text)
}

export function RichTextEditor({ content, onChange, placeholder, minRows = 6 }: RichTextEditorProps) {
  const [tab, setTab] = useState<'write' | 'preview'>('write')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? 'Write something…' }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'tiptap-link' } }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
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

  const handleLinkInsert = () => {
    const url = window.prompt('Enter URL:', editor.getAttributes('link').href ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
    } else {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const isInTable = editor.isActive('table')

  const previewHtml = tab === 'preview' ? editor.getHTML() : ''

  return (
    <div className="bg-gray-700 border border-gray-600 rounded-lg focus-within:border-indigo-500 overflow-hidden">
      {/* Write / Preview tabs */}
      <div className="flex items-center gap-0 px-2 pt-1.5 border-b border-gray-600 bg-gray-800">
        <button
          type="button"
          onClick={() => setTab('write')}
          className={`px-3 py-1 text-xs font-medium rounded-t transition-colors ${
            tab === 'write'
              ? 'bg-gray-700 text-white border border-b-transparent border-gray-600'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={`px-3 py-1 text-xs font-medium rounded-t transition-colors ${
            tab === 'preview'
              ? 'bg-gray-700 text-white border border-b-transparent border-gray-600'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Preview
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-gray-600 pr-1 pb-1">Markdown supported</span>
      </div>

      {tab === 'preview' ? (
        <div className="px-3 py-2 min-h-[5rem]" style={editorStyle}>
          {previewHtml && previewHtml !== '<p></p>'
            ? <RichTextDisplay html={previewHtml} />
            : <p className="text-gray-500 text-sm italic">Nothing to preview.</p>
          }
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-600 bg-gray-800/60">
            {/* Text style */}
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}>
              <strong>B</strong>
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))}>
              <em>I</em>
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))}>
              <span className="underline">U</span>
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive('strike'))}>
              <span className="line-through">S</span>
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive('code'))}>
              <code className="text-[11px]">`c`</code>
            </button>

            <span className="w-px h-4 bg-gray-600 mx-1 shrink-0" />

            {/* Headings */}
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive('heading', { level: 1 }))}>
              H1
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))}>
              H2
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive('heading', { level: 3 }))}>
              H3
            </button>

            <span className="w-px h-4 bg-gray-600 mx-1 shrink-0" />

            {/* Lists */}
            <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}>
              • List
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))}>
              1. List
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={btn(editor.isActive('taskList'))} title="Task list">
              ☑
            </button>

            <span className="w-px h-4 bg-gray-600 mx-1 shrink-0" />

            {/* Blocks */}
            <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))}>
              ❝
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btn(editor.isActive('codeBlock'))} title="Code block">
              {'</>'}
            </button>
            <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)}>
              ─
            </button>

            <span className="w-px h-4 bg-gray-600 mx-1 shrink-0" />

            {/* Link */}
            <button type="button" onClick={handleLinkInsert} className={btn(editor.isActive('link'))} title="Insert / edit link">
              🔗
            </button>

            {/* Table */}
            {!isInTable ? (
              <button
                type="button"
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                className={btn(false)}
                title="Insert table"
              >
                ⊞
              </button>
            ) : (
              <>
                <span className="w-px h-4 bg-gray-600 mx-1 shrink-0" />
                <button type="button" onClick={() => editor.chain().focus().addColumnBefore().run()} className={btn(false)} title="Add column before">+Col←</button>
                <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className={btn(false)} title="Add column after">+Col→</button>
                <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className={btn(false)} title="Delete column">-Col</button>
                <button type="button" onClick={() => editor.chain().focus().addRowBefore().run()} className={btn(false)} title="Add row before">+Row↑</button>
                <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className={btn(false)} title="Add row after">+Row↓</button>
                <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className={btn(false)} title="Delete row">-Row</button>
                <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className={btn(false, 'text-red-400')} title="Delete table">✕Table</button>
              </>
            )}

            <span className="w-px h-4 bg-gray-600 mx-1 shrink-0" />

            {/* Undo/Redo */}
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
        </>
      )}
    </div>
  )
}
