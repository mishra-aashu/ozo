import React from 'react'

export const getAvatarUrl = (profile, user) => {
  if (profile?.avatar_url) return profile.avatar_url
  // Generate a premium illustrative avatar based on user's name or email
  const seed = profile?.full_name || user?.email || 'ozo_user'
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(seed)}`
}

const UserAvatar = ({ profile, user, className = 'w-10 h-10', imgClassName = 'w-full h-full object-cover' }) => {
  const avatarUrl = getAvatarUrl(profile, user)
  const displayName = profile?.full_name || user?.email || 'User'

  return (
    <div className={`relative overflow-hidden flex items-center justify-center ${className}`}>
      <img
        src={avatarUrl}
        alt={displayName}
        className={imgClassName}
        loading="lazy"
        onError={(e) => {
          // Fallback to initials if the avatar image fails to load
          e.target.style.display = 'none'
          const parent = e.target.parentElement
          if (parent && !parent.querySelector('.avatar-fallback-initials')) {
            const span = document.createElement('span')
            span.className = 'avatar-fallback-initials font-bold text-gray-700 dark:text-gray-200 uppercase'
            span.innerText = displayName.charAt(0)
            parent.appendChild(span)
          }
        }}
      />
    </div>
  )
}

export default UserAvatar
