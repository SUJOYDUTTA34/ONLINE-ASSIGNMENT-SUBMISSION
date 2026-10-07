import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { storage } from '../../services/storage';
import { Course } from '../../types';
import {
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  CheckCircle,
  FileCode,
  BookOpen,
  Calendar,
  Building,
  Tag,
  Info,
} from 'lucide-react';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: () => void;
  preselectedCourseId?: string;
}

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'txt', 'png', 'jpg', 'jpeg'];
const FORBIDDEN_EXTENSIONS = ['exe', 'sh', 'bat', 'cmd', 'msi', 'bin', 'js', 'vbs'];

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  onUploaded,
  preselectedCourseId,
}) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [courseId, setCourseId] = useState(preselectedCourseId || '');
  const [docName, setDocName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'syllabus' | 'lecture' | 'guide' | 'manual' | 'reference'>('lecture');
  
  const [file, setFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!user || !isOpen) return null;

  // Get courses the user can interact with
  const allCourses = storage.getCourses();
  const enrolledCourses =
    user.role === 'admin'
      ? allCourses
      : user.role === 'faculty'
      ? allCourses.filter(
          (c) =>
            c.facultyId === user.id ||
            (c.facultyIds && c.facultyIds.includes(user.id))
        )
      : allCourses.filter(
          (c) =>
            c.enrolledStudentIds?.includes(user.id) ||
            (user.enrolledCourseIds && user.enrolledCourseIds.includes(c.id))
        );

  // If no enrolled courses found, allow selecting from any available course in the catalog
  const courses = enrolledCourses.length > 0 ? enrolledCourses : allCourses;

  const validateFile = (selectedFile: File): boolean => {
    setError(null);
    if (!selectedFile || selectedFile.size === 0) {
      setError('Please select a valid non-empty file.');
      return false;
    }

    const maxMb = 100; // Generous 100MB maximum document limit
    const maxBytes = maxMb * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setError(`File size exceeds the ${maxMb} MB limit. Please select a smaller file.`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (selected: File) => {
    if (validateFile(selected)) {
      setFile(selected);
      // Fallback name if custom document name is empty
      if (!docName.trim()) {
        const cleanName = selected.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' ');
        setDocName(cleanName);
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileDataUrl(e.target?.result as string);
      };
      reader.readAsDataURL(selected);
    } else {
      setFile(null);
      setFileDataUrl(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!courseId) {
      setError('Please select a target course.');
      return;
    }

    if (!docName.trim()) {
      setError('Please provide a document title.');
      return;
    }

    if (!file || !fileDataUrl) {
      setError('Please select or upload a document file.');
      return;
    }

    setIsUploading(true);

    try {
      const targetCourse = storage.getCourseById(courseId);
      if (!targetCourse) {
        throw new Error('Selected course could not be found.');
      }

      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'bin';

      // Upload file to server vault
      let serverFileKey: string | undefined = undefined;
      let serverR2Url: string | undefined = undefined;
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('courseId', targetCourse.id);
        formData.append('courseCode', targetCourse.code || targetCourse.courseCode || '');
        formData.append('courseName', targetCourse.title || targetCourse.courseName || '');
        formData.append('assignmentId', 'course-material');
        formData.append('assignmentTitle', docName.trim());
        formData.append('userName', user.name);

        const uploadRes = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'X-User-Id': user.id,
            'X-User-Role': user.role,
            'X-User-Email': user.email || '',
            'X-User-Name': user.name || '',
          },
        });
        const contentType = uploadRes.headers.get('content-type') || '';
        if (uploadRes.ok && contentType.includes('application/json')) {
          const uploadJson = await uploadRes.json().catch(() => ({}));
          if (uploadJson.success && uploadJson.fileKey) {
            serverFileKey = uploadJson.fileKey;
          }
          if (uploadJson.r2Url) {
            serverR2Url = uploadJson.r2Url;
          }
        }
      } catch (uploadErr) {
        console.warn('Backend file vault sync skipped, using local persistence:', uploadErr);
      }
      
      const newDocument = {
        id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: docName.trim(),
        fileName: file.name,
        fileKey: serverFileKey,
        fileUrl: serverR2Url || (serverFileKey ? `/api/files/preview/${serverFileKey}` : undefined),
        r2Url: serverR2Url,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        fileType: fileExtension.toUpperCase(),
        category,
        description: description.trim(),
        dataUrl: fileDataUrl,
        uploadedBy: user.name,
        uploadedById: user.id,
        uploadedAt: new Date().toISOString(),
      };

      // Safely fetch and update course documents
      const currentDocs = targetCourse.documents || [];
      const updatedDocs = [newDocument, ...currentDocs];

      // Update the course in local storage
      storage.updateCourse(courseId, {
        ...targetCourse,
        documents: updatedDocs,
      }, user);

      // Add a system notification for the course cohort
      if (user.role !== 'student' && targetCourse.enrolledStudentIds?.length > 0) {
        targetCourse.enrolledStudentIds.forEach((studentId) => {
          storage.addNotification({
            userId: studentId,
            title: `New Reference Material: ${newDocument.name}`,
            message: `${user.name} uploaded a new document (${newDocument.fileType}) for ${targetCourse.code || targetCourse.courseCode}.`,
            type: 'announcement',
            actionTab: 'my-courses',
          });
        });
      }

      showToast({
        type: 'success',
        title: 'Document Uploaded Successfully',
        message: `"${newDocument.name}" has been added to ${targetCourse.code || targetCourse.courseCode}.`,
      });

      // Clear form and trigger updates
      setFile(null);
      setFileDataUrl(null);
      setDocName('');
      setDescription('');
      if (onUploaded) onUploaded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete document registration.');
    } finally {
      setIsUploading(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'syllabus': return 'Course Syllabus';
      case 'lecture': return 'Lecture Note / Handout';
      case 'guide': return 'Study Guide';
      case 'manual': return 'Lab Manual';
      case 'reference': return 'Reference Reading';
      default: return 'Document';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-xs max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center p-1 font-bold">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Upload Course Document
              </h3>
              <p className="text-[10px] text-slate-400">Add syllabus resources, references or lecture notes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            disabled={isUploading}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-4 overflow-y-auto pr-1 flex-1">
          {/* Target Course Selector */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              Target Academic Course *
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              required
              disabled={!!preselectedCourseId}
            >
              <option value="">-- Choose Course --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code || c.courseCode} — {c.title || c.courseName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Custom Name */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Document Title *
              </label>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Unit 3 Distributed Lock Guide"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            {/* Document Category */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Resource Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="lecture">Lecture Note / Handout</option>
                <option value="syllabus">Syllabus Outline</option>
                <option value="guide">Study Guide / Cheat Sheet</option>
                <option value="manual">Laboratory Manual</option>
                <option value="reference">Reference Reading / Book</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              Resource Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Provide context about what this resource covers..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* File Upload Stage */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Document File *
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('manual-document-file')?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 scale-[0.99]'
                  : file
                  ? 'border-emerald-500/80 bg-emerald-50/10 dark:bg-emerald-950/10'
                  : 'border-slate-300 dark:border-slate-800 hover:border-blue-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                id="manual-document-file"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')}
              />

              {file ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[280px]">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.name.split('.').pop()?.toUpperCase()} Document
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setFileDataUrl(null);
                    }}
                    className="mt-3 text-[10px] text-rose-500 hover:underline font-semibold"
                  >
                    Remove File
                  </button>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-500 flex items-center justify-center mb-2">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Drag and drop your file here, or <span className="text-blue-600 dark:text-blue-400 hover:underline">browse files</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Accepts PDF, Word, Excel, PowerPoint, ZIP, Images or TXT (Max 25MB)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs flex items-center gap-2 transition-colors disabled:opacity-55"
            >
              {isUploading ? 'Registering Document...' : 'Upload Document'}
              <CheckCircle className="w-4 h-4" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
