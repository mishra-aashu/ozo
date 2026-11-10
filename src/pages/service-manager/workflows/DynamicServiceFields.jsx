import React from 'react'
import HVACWorkflowCard from './HVACWorkflowCard'
import PlumbingWorkflowCard from './PlumbingWorkflowCard'
import ElectricalWorkflowCard from './ElectricalWorkflowCard'
import CleaningWorkflowCard from './CleaningWorkflowCard'
import CarpentryWorkflowCard from './CarpentryWorkflowCard'
import PestControlWorkflowCard from './PestControlWorkflowCard'

export default function DynamicServiceFields({ booking, onUpdateData, isReadOnly = false }) {
  if (!booking) return null

  const category = (booking.category_slug || booking.category || '').toLowerCase()

  if (category.includes('ac') || category.includes('appliance') || category.includes('cooling')) {
    return <HVACWorkflowCard booking={booking} onUpdateData={onUpdateData} isReadOnly={isReadOnly} />
  }

  if (category.includes('plumb') || category.includes('pipe') || category.includes('tap') || category.includes('drain')) {
    return <PlumbingWorkflowCard booking={booking} onUpdateData={onUpdateData} isReadOnly={isReadOnly} />
  }

  if (category.includes('elect') || category.includes('wire') || category.includes('switch') || category.includes('light')) {
    return <ElectricalWorkflowCard booking={booking} onUpdateData={onUpdateData} isReadOnly={isReadOnly} />
  }

  if (category.includes('clean') || category.includes('sanitiz') || category.includes('wash')) {
    return <CleaningWorkflowCard booking={booking} onUpdateData={onUpdateData} isReadOnly={isReadOnly} />
  }

  if (category.includes('carpent') || category.includes('furnitur') || category.includes('wood') || category.includes('door')) {
    return <CarpentryWorkflowCard booking={booking} onUpdateData={onUpdateData} isReadOnly={isReadOnly} />
  }

  if (category.includes('pest') || category.includes('bug') || category.includes('termite')) {
    return <PestControlWorkflowCard booking={booking} onUpdateData={onUpdateData} isReadOnly={isReadOnly} />
  }

  // Fallback for general services: show electrical or HVAC as default technical card
  return <HVACWorkflowCard booking={booking} onUpdateData={onUpdateData} isReadOnly={isReadOnly} />
}
