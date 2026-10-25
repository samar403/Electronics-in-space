import { useEffect } from 'react'
import { AltitudeRail, type RailStop } from './components/AltitudeRail'
import { Atlas } from './components/Atlas'
import { BitArena } from './components/BitArena'
import { Business } from './components/Business'
import { ChipExplorer } from './components/ChipExplorer'
import { Dosimeter } from './components/Dosimeter'
import { Downlink } from './components/Downlink'
import { Footer } from './components/Footer'
import { Hero } from './components/Hero'
import { Landscape } from './components/Landscape'
import { MissionPlanner } from './components/MissionPlanner'
import { Qualification } from './components/Qualification'
import { StrikeOverlay } from './components/StrikeOverlay'
import { Thesis } from './components/Thesis'
import { startEngine, useRad } from './lib/radStore'

const STOPS: RailStop[] = [
  { id: 'top', regime: 'ground', name: 'Launch' },
  { id: 'thesis', regime: 'leo', name: 'The idea' },
  { id: 'atlas', regime: 'leo', name: 'Effects' },
  { id: 'arena', regime: 'saa', name: 'Bit Arena' },
  { id: 'chip', regime: 'inner', name: 'HALO-7' },
  { id: 'planner', regime: 'slot', name: 'Planner' },
  { id: 'downlink', regime: 'outer', name: 'Downlink' },
  { id: 'landscape', regime: 'geo', name: 'Landscape' },
  { id: 'criteria', regime: 'geo', name: 'Criteria' },
  { id: 'business', regime: 'deep', name: 'Company' },
]

export default function App() {
  const mode = useRad((s) => s.mode)
  useEffect(() => startEngine(), [])
  useEffect(() => {
    document.documentElement.dataset.silicon = mode
  }, [mode])

  return (
    <>
      <a className="skip" href="#thesis">
        Skip to content
      </a>
      <StrikeOverlay />
      <AltitudeRail stops={STOPS} />
      <Dosimeter />
      <main>
        <Hero />
        <Thesis />
        <Atlas />
        <BitArena />
        <ChipExplorer />
        <MissionPlanner />
        <Downlink />
        <Landscape />
        <Qualification />
        <Business />
      </main>
      <Footer />
    </>
  )
}
