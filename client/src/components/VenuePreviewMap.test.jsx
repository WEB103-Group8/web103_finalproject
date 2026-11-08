// this test checks that the small venue map draws with its pin
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import VenuePreviewMap from './VenuePreviewMap'

describe('VenuePreviewMap', () => {
  it('draws a labelled map with one pin', () => {
    const { container } = render(<VenuePreviewMap latitude={30.2672} longitude={-97.7431} label="Cafe Mocha" />)

    expect(screen.getByRole('img', { name: 'Map showing Cafe Mocha' })).toBeInTheDocument()
    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1)
  })
})
