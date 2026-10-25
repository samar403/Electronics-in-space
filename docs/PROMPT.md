# The brief

This is the brief the project was built from. It frames the idea, the audience and the bar for quality, so
anyone can rebuild, extend or critique it.

---

> **Idea:** *Electronics in space: radiation-hardened AI chips for orbit.*
>
> You are founding a deep-tech hardware startup. Explain the idea so that an investor, a satellite engineer
> and a curious student all understand three things within five minutes:
>
> 1. **Why space breaks chips.** Cover the real physics: total ionising dose, displacement damage, and the
>    single-event family (SEU, MBU, SET, SEFI, SEL, SEB/SEGR). Explain how each is measured and which
>    standard qualifies it.
> 2. **Why this matters now.** Constellations are multiplying, downlink is the bottleneck, rad-hard
>    processors lag commercial silicon by decades, and COTS GPUs fail in ways you can't see.
> 3. **Why this company can win.** Hardening by process (FD-SOI), by architecture (ABFT, selective TMR,
>    interleaved ECC, scrubbing), by adaptation (an on-die environment sensor) and by software (a
>    fault-aware compiler). Then a credible business: segments, model, roadmap, risks.
>
> **Experience bar:** Don't just tell people about radiation. Let them experience it. The website should
> take simulated particle strikes as you read it. Scrolling should feel like climbing through the
> magnetosphere. Every number should come from a model you can inspect, cite or test. It must work on a
> phone, from a keyboard and with a screen reader, and respect reduced motion.
>
> **Accuracy bar:** Use real standards (MIL-STD-883 TM1019, JESD57, JESD234, JESD89, ESCC 22900/25100,
> ECSS-Q-ST-60-15C, MIL-PRF-38535 RHA levels, ASTM E595, GEVS), real facilities and real orbital
> mechanics. Label every estimate as an estimate and every spec as a target.

---

## How the build answers the brief

| Brief asks for | Where it lives |
| --- | --- |
| Experience radiation, don't just read about it | Page-wide strike engine (`src/lib/radStore.ts`), bit-flipping text (`FlipText.tsx`), latch-ups (`Section.tsx`), strike tracks (`StrikeOverlay.tsx`) |
| Scroll = ascent through the magnetosphere | `AltitudeRail.tsx` + each section's `regime` |
| The physics of each effect | `Atlas.tsx` (8 effects, mechanism, metric, standard, mitigation) and `IonStrike.tsx` (bulk vs FD-SOI charge collection) |
| Why hardening matters, live | `BitArena.tsx`: identical strikes on COTS vs HALO memory with SDC, SEFI, scrub and interleave |
| The product | `ChipExplorer.tsx`: die floorplan, adaptive hardening tied to the environment, thermal radiator sizing |
| Numbers you can trust | `MissionPlanner.tsx` → `src/lib/radiation.ts`, `src/lib/orbit.ts` (unit-tested) |
| Why compute in orbit | `Downlink.tsx` → `src/lib/downlink.ts` |
| Competitive context | `Landscape.tsx` |
| Qualification criteria | `Qualification.tsx` |
| Business | `Business.tsx`, `docs/THESIS.md` |
