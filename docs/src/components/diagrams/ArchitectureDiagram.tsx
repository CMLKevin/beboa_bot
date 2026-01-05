'use client';

import { Diagram, DiagramBox, DiagramArrow, DiagramGroup, DiagramLabel } from './DiagramPrimitives';

// AI Systems Flow Diagram
export function AISystemsDiagram() {
  return (
    <Diagram height={380}>
      {/* User Input */}
      <DiagramBox
        x={320}
        y={20}
        label="User Interaction"
        sublabel="@mention or message"
        variant="accent"
      />

      {/* Arrow down to LLM Evaluator */}
      <DiagramArrow
        from={{ x: 400, y: 80 }}
        to={{ x: 400, y: 110 }}
        variant="accent"
      />

      {/* LLM Evaluator - Central service */}
      <DiagramGroup x={180} y={120} width={440} height={80} title="LLM Evaluator Service">
        <DiagramBox x={200} y={145} width={120} height={40} label="Mood Detection" variant="primary" />
        <DiagramBox x={340} y={145} width={120} height={40} label="Relationships" variant="primary" />
        <DiagramBox x={480} y={145} width={120} height={40} label="Jarvis Parser" variant="primary" />
      </DiagramGroup>

      {/* Arrows down to three pillars */}
      <DiagramArrow from={{ x: 260, y: 200 }} to={{ x: 180, y: 240 }} />
      <DiagramArrow from={{ x: 400, y: 200 }} to={{ x: 400, y: 240 }} />
      <DiagramArrow from={{ x: 540, y: 200 }} to={{ x: 620, y: 240 }} />

      {/* Three Pillars */}
      <DiagramBox
        x={100}
        y={250}
        label="Personality"
        sublabel="14 Traits + 11 Moods"
        variant="default"
      />
      <DiagramBox
        x={320}
        y={250}
        label="User Memory"
        sublabel="Per-user facts"
        variant="default"
      />
      <DiagramBox
        x={540}
        y={250}
        label="Server Memory"
        sublabel="Ambient awareness"
        variant="default"
      />

      {/* Arrows down to Response */}
      <DiagramArrow from={{ x: 180, y: 310 }} to={{ x: 320, y: 340 }} />
      <DiagramArrow from={{ x: 400, y: 310 }} to={{ x: 400, y: 340 }} />
      <DiagramArrow from={{ x: 620, y: 310 }} to={{ x: 480, y: 340 }} />

      {/* Response */}
      <DiagramBox
        x={280}
        y={330}
        width={240}
        height={40}
        label="Context-Aware Response"
        variant="accent"
      />
    </Diagram>
  );
}

// Services Layer Diagram
export function ServicesLayerDiagram() {
  return (
    <Diagram height={300}>
      {/* Event Handlers Layer */}
      <DiagramGroup x={100} y={20} width={600} height={60} title="Event Handlers">
        <DiagramBox x={200} y={40} width={100} height={30} label="commands/" variant="secondary" />
        <DiagramBox x={350} y={40} width={100} height={30} label="events/" variant="secondary" />
        <DiagramBox x={500} y={40} width={100} height={30} label="handlers/" variant="secondary" />
      </DiagramGroup>

      {/* Arrow */}
      <DiagramArrow from={{ x: 400, y: 80 }} to={{ x: 400, y: 110 }} variant="accent" />

      {/* Services Layer */}
      <DiagramGroup x={50} y={120} width={700} height={160} title="Services Layer">
        {/* Row 1 */}
        <DiagramBox x={80} y={150} width={100} height={40} label="database" variant="primary" />
        <DiagramBox x={200} y={150} width={100} height={40} label="openrouter" variant="primary" />
        <DiagramBox x={320} y={150} width={100} height={40} label="chat" variant="primary" />
        <DiagramBox x={440} y={150} width={100} height={40} label="memory" variant="primary" />
        <DiagramBox x={560} y={150} width={100} height={40} label="personality" variant="primary" />

        {/* Row 2 */}
        <DiagramBox x={120} y={210} width={120} height={40} label="llmEvaluator" variant="accent" />
        <DiagramBox x={260} y={210} width={120} height={40} label="adminCommands" variant="primary" />
        <DiagramBox x={400} y={210} width={120} height={40} label="serverMemory" variant="primary" />
        <DiagramBox x={540} y={210} width={120} height={40} label="tools" variant="primary" />
      </DiagramGroup>
    </Diagram>
  );
}

// Server Memory Pipeline
export function ServerMemoryPipelineDiagram() {
  return (
    <Diagram height={320}>
      {/* Discord Messages */}
      <DiagramBox
        x={320}
        y={20}
        label="All Discord Messages"
        sublabel="Non-blocking capture"
        variant="accent"
      />

      <DiagramArrow from={{ x: 400, y: 80 }} to={{ x: 400, y: 110 }} variant="accent" />

      {/* Message Ingestion */}
      <DiagramBox
        x={280}
        y={120}
        width={240}
        height={50}
        label="Message Ingestion"
        sublabel="Importance scoring (0-1)"
      />

      {/* Two branches */}
      <DiagramArrow from={{ x: 340, y: 170 }} to={{ x: 220, y: 200 }} />
      <DiagramArrow from={{ x: 460, y: 170 }} to={{ x: 580, y: 200 }} />

      {/* Raw DB and Embedding Queue */}
      <DiagramBox x={140} y={210} width={120} height={40} label="Raw Storage" sublabel="100%" variant="default" />
      <DiagramBox x={540} y={210} width={120} height={40} label="Embedding Queue" sublabel="~30%" variant="default" />

      {/* Arrow to Background Worker */}
      <DiagramArrow from={{ x: 600, y: 250 }} to={{ x: 600, y: 280 }} />

      {/* Background Worker */}
      <DiagramBox x={520} y={270} width={160} height={40} label="Background Processor" variant="primary" />

      {/* Arrow to Retrieval */}
      <DiagramArrow from={{ x: 200, y: 250 }} to={{ x: 320, y: 310 }} />
      <DiagramArrow from={{ x: 520, y: 290 }} to={{ x: 440, y: 310 }} />

      {/* Retrieval Service */}
      <DiagramLabel x={400} y={295} variant="muted">Context Building</DiagramLabel>
    </Diagram>
  );
}

// Message Processing Flow
export function MessageFlowDiagram() {
  return (
    <Diagram height={420}>
      {/* Step 1: User Message */}
      <DiagramBox x={320} y={20} label="1. User @mentions Beboa" variant="accent" />

      <DiagramArrow from={{ x: 400, y: 80 }} to={{ x: 400, y: 100 }} />

      {/* Step 2: Memory Search */}
      <DiagramBox x={320} y={110} label="2. Search Memories" sublabel="User + Server context" />

      <DiagramArrow from={{ x: 400, y: 170 }} to={{ x: 400, y: 190 }} />

      {/* Step 3: Load Relationship */}
      <DiagramBox x={320} y={200} label="3. Load Relationship" sublabel="Trust, familiarity, stage" />

      <DiagramArrow from={{ x: 400, y: 260 }} to={{ x: 400, y: 280 }} />

      {/* Step 4: LLM Evaluates */}
      <DiagramBox x={320} y={290} label="4. LLM Evaluator" sublabel="Mood + interaction quality" variant="primary" />

      <DiagramArrow from={{ x: 400, y: 350 }} to={{ x: 400, y: 370 }} />

      {/* Step 5: Generate Response */}
      <DiagramBox x={320} y={380} label="5. Generate Response" sublabel="Personality + context" variant="accent" />
    </Diagram>
  );
}
