import React, { useState } from 'react';

interface FeedbackWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  buttonText?: string;
  onSubmit?: (feedback: FeedbackData) => Promise<void> | void;
  showEmail?: boolean;
  showScreenshot?: boolean;
}

interface FeedbackData {
  rating: number;
  comment: string;
  email?: string;
  pageUrl: string;
  userAgent: string;
  timestamp: string;
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  position = 'bottom-right',
  buttonText = '反馈',
  onSubmit,
  showEmail = true,
  showScreenshot = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const feedbackData: FeedbackData = {
        rating,
        comment,
        email: showEmail && email ? email : undefined,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };

      if (onSubmit) {
        await onSubmit(feedbackData);
      } else {
        // 默认提交到API
        await submitToApi(feedbackData);
      }

      setSubmitStatus('success');
      setTimeout(() => {
        setIsOpen(false);
        resetForm();
      }, 2000);
    } catch (error) {
      console.error('Feedback submission failed:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitToApi = async (feedback: FeedbackData) => {
    const response = await fetch('/api/v1/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedback)
    });

    if (!response.ok) {
      throw new Error(`Feedback submission failed: ${response.statusText}`);
    }
  };

  const resetForm = () => {
    setRating(0);
    setComment('');
    setEmail('');
    setSubmitStatus('idle');
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleStarClick = (value: number) => {
    setRating(value);
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* 反馈按钮 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary-color text-white px-4 py-2 rounded-lg shadow-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
        >
          <span className="text-lg">💬</span>
          <span>{buttonText}</span>
        </button>
      )}

      {/* 反馈表单 */}
      {isOpen && (
        <div className="bg-white rounded-lg shadow-xl w-80 max-w-[90vw] border border-gray-200">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-text-primary">提供反馈</h3>
              <button
                onClick={handleClose}
                className="text-text-secondary hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 评分 */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  您如何评价这个功能？
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleStarClick(star)}
                      className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* 评论 */}
              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-text-primary mb-2">
                  您的反馈意见
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-color focus:border-transparent"
                  placeholder="请告诉我们您的想法、建议或遇到的问题..."
                  required
                />
              </div>

              {/* 邮箱（可选） */}
              {showEmail && (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                    邮箱（可选，用于回复）
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-color focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              )}

              {/* 截图功能（未来实现） */}
              {showScreenshot && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    附加截图（可选）
                  </label>
                  <button
                    type="button"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-text-secondary hover:bg-gray-50"
                    onClick={() => alert('截图功能待实现')}
                  >
                    选择文件或截图
                  </button>
                </div>
              )}

              {/* 提交状态 */}
              {submitStatus === 'success' && (
                <div className="p-2 bg-green-50 text-green-700 rounded text-sm">
                  ✅ 感谢您的反馈！
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="p-2 bg-red-50 text-red-700 rounded text-sm">
                  ❌ 提交失败，请稍后重试
                </div>
              )}

              {/* 提交按钮 */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-text-primary rounded-md hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-color text-white rounded-md hover:bg-primary-hover disabled:opacity-50"
                  disabled={isSubmitting || !comment.trim()}
                >
                  {isSubmitting ? '提交中...' : '提交反馈'}
                </button>
              </div>
            </form>

            <div className="mt-4 text-xs text-text-secondary text-center">
              您的反馈将帮助我们改进产品
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackWidget;