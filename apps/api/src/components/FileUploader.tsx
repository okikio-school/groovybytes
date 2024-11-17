'use client'

import * as React from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, Cloud, X } from 'lucide-react'

export default function FileUploader() {
  const [files, setFiles] = React.useState<File[]>([])
  const [dragActive, setDragActive] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles(prevFiles => [...prevFiles, ...droppedFiles])
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles(prevFiles => [...prevFiles, ...newFiles])
    }
  }

  const removeFile = (fileName: string) => {
    setFiles(prevFiles => prevFiles.filter(file => file.name !== fileName))
  }

  const openFileDialog = () => {
    inputRef.current?.click()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      openFileDialog()
    }
  }

  const handleUpload = async () => {
    if (!files.length) return;

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      console.log('Files uploaded successfully');
    } else {
      console.error('Error uploading files');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-lg p-12 ${
          dragActive ? 'border-red-500 bg-red-500/5' : 'border-gray-200'
        } cursor-pointer`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label="Click to upload files or drag and drop files here"
      >
        <Input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleChange}
          tabIndex={-1}
          aria-hidden="true"
        />
        <div className="flex flex-col items-center justify-center gap-4">
          <Cloud className="h-12 w-12 text-gray-400" />
          <h3 className="text-lg font-semibold">Drag and drop your files here</h3>
          <p className="text-sm text-gray-500">
            or click to browse your files
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-3 px-4 bg-white/20 rounded-lg shadow-sm border"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(file.name)}
                className="opacity-60 hover:opacity-100"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove {file.name}</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="default"
        size={files.length > 0 ? 'lg' : 'sm'}
        onClick={handleUpload}
        className="bg-blue-500/40 hover:bg-blue-400/20"
      >
        <span>Upload Files</span>
      </Button>
    </div>
  )
}