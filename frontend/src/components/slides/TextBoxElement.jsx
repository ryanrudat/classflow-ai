import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

/**
 * TextBoxElement - Editable text box with rich text formatting
 * Double-click to edit, click away to save
 */
export default function TextBoxElement({ element, isSelected, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)

  const editor = useEditor({
    extensions: [StarterKit],
    content: element.content || '<p>Double-click to edit</p>',
    editable: isEditing,
    onUpdate: ({ editor }) => {
      onUpdate({ content: editor.getHTML() })
    }
  })

  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing)
    }
  }, [isEditing, editor])

  const handleDoubleClick = (e) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
  }

  const getTextStyles = () => {
    const styles = element.style || {}
    return {
      fontSize: `${styles.fontSize || 18}px`,
      fontWeight: styles.fontWeight || 'normal',
      color: styles.color || '#000000',
      textAlign: styles.textAlign || 'left',
      fontFamily: styles.fontFamily || 'Arial, sans-serif',
      lineHeight: styles.lineHeight || '1.5'
    }
  }

  return (
    <div
      className={`
        w-full h-full p-3 overflow-auto
        ${isEditing ? 'cursor-text' : 'cursor-move'}
        ${isSelected && !isEditing ? 'ring-2 ring-blue-400 ring-inset' : ''}
      `}
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      style={{
        ...getTextStyles(),
        backgroundColor: element.backgroundColor || 'transparent'
      }}
    >
      <EditorContent
        editor={editor}
        className="prose max-w-none focus:outline-none"
      />

      {/* Editing indicator */}
      {isEditing && (
        <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
          Editing
        </div>
      )}
    </div>
  )
}
