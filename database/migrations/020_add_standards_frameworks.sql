-- Migration: Add Standards Frameworks and Standards Tables
-- Supports Common Core ELA, CCSS Math, NGSS, C3 Framework, ACTFL, and more

-- ============================================
-- STANDARDS FRAMEWORKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS standards_frameworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,  -- 'CCSS_ELA', 'NGSS', 'C3', etc.
  name VARCHAR(200) NOT NULL,
  description TEXT,
  organization VARCHAR(200),  -- 'National Governors Association', etc.
  website_url VARCHAR(500),
  applies_to_subjects JSONB DEFAULT '[]'::jsonb,  -- Array of main subject IDs
  is_universal BOOLEAN DEFAULT false,  -- true for Speaking & Listening (applies to all)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- STANDARDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS standards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  framework_id UUID NOT NULL REFERENCES standards_frameworks(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,  -- 'SL.7.1', 'D2.His.1.6-8', 'MS-LS1-6'
  grade_band VARCHAR(30),  -- 'K-2', '3-5', '6-8', '9-12', 'K-12'
  strand VARCHAR(150),  -- 'Speaking & Listening', 'History', 'Life Science'
  domain VARCHAR(150),  -- More specific categorization
  full_text TEXT NOT NULL,
  short_text VARCHAR(300),  -- Abbreviated for display
  is_practice_standard BOOLEAN DEFAULT false,  -- MP, SEP vs content standards
  parent_standard_id UUID REFERENCES standards(id),  -- For sub-standards like SL.7.1.A
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(framework_id, code)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_standards_framework ON standards(framework_id);
CREATE INDEX IF NOT EXISTS idx_standards_grade_band ON standards(grade_band);
CREATE INDEX IF NOT EXISTS idx_standards_strand ON standards(strand);
CREATE INDEX IF NOT EXISTS idx_standards_practice ON standards(is_practice_standard) WHERE is_practice_standard = true;
CREATE INDEX IF NOT EXISTS idx_standards_parent ON standards(parent_standard_id);

-- ============================================
-- TOPIC-STANDARDS LINKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS topic_standards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES reverse_tutoring_topics(id) ON DELETE CASCADE,
  standard_id UUID NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,  -- Primary vs. supporting standard
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(topic_id, standard_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_standards_topic ON topic_standards(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_standards_standard ON topic_standards(standard_id);

-- ============================================
-- CONVERSATION STANDARDS PROGRESS
-- ============================================

-- Track standards mastery per conversation
ALTER TABLE reverse_tutoring_conversations
ADD COLUMN IF NOT EXISTS standards_progress JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN reverse_tutoring_conversations.standards_progress IS
'Tracks progress on each standard: { "standard_code": { "level": 1-4, "evidence": "..." } }';

-- ============================================
-- SEED DATA: STANDARDS FRAMEWORKS
-- ============================================

INSERT INTO standards_frameworks (id, code, name, description, organization, is_universal, applies_to_subjects) VALUES
  -- Common Core ELA - Speaking & Listening (Universal)
  ('f1000000-0000-0000-0000-000000000001', 'CCSS_ELA_SL', 'Common Core Speaking & Listening',
   'Standards for collaborative discussions, presenting information, and adapting speech',
   'National Governors Association', true, '[]'::jsonb),

  -- Common Core ELA - Full
  ('f1000000-0000-0000-0000-000000000002', 'CCSS_ELA', 'Common Core English Language Arts',
   'Standards for reading, writing, speaking, listening, and language',
   'National Governors Association', false, '["a1000000-0000-0000-0000-000000000001"]'::jsonb),

  -- Common Core Math
  ('f1000000-0000-0000-0000-000000000003', 'CCSS_MATH', 'Common Core Mathematics',
   'Standards for mathematical content and practice',
   'National Governors Association', false, '["a1000000-0000-0000-0000-000000000003"]'::jsonb),

  -- Next Generation Science Standards
  ('f1000000-0000-0000-0000-000000000004', 'NGSS', 'Next Generation Science Standards',
   'Standards for science content and science/engineering practices',
   'Achieve, Inc.', false, '["a1000000-0000-0000-0000-000000000002"]'::jsonb),

  -- C3 Framework for Social Studies
  ('f1000000-0000-0000-0000-000000000005', 'C3', 'C3 Framework for Social Studies',
   'College, Career, and Civic Life Framework for Social Studies',
   'National Council for the Social Studies', false, '["a1000000-0000-0000-0000-000000000004"]'::jsonb),

  -- ACTFL World Languages
  ('f1000000-0000-0000-0000-000000000006', 'ACTFL', 'ACTFL World-Readiness Standards',
   'Standards for language learning: Communication, Cultures, Connections, Comparisons, Communities',
   'American Council on the Teaching of Foreign Languages', false, '["a1000000-0000-0000-0000-000000000005"]'::jsonb),

  -- National Core Arts Standards
  ('f1000000-0000-0000-0000-000000000007', 'NCAS', 'National Core Arts Standards',
   'Standards for visual arts, music, theater, dance, and media arts',
   'National Coalition for Core Arts Standards', false, '["a1000000-0000-0000-0000-000000000006"]'::jsonb),

  -- SHAPE America (Health/PE)
  ('f1000000-0000-0000-0000-000000000008', 'SHAPE', 'SHAPE America Standards',
   'National Standards for K-12 Physical Education and Health Education',
   'SHAPE America', false, '["a1000000-0000-0000-0000-000000000007"]'::jsonb),

  -- ISTE/CSTA (Technology)
  ('f1000000-0000-0000-0000-000000000009', 'ISTE_CSTA', 'ISTE & CSTA Standards',
   'Standards for students in technology and computer science',
   'ISTE and CSTA', false, '["a1000000-0000-0000-0000-000000000008"]'::jsonb)

ON CONFLICT (code) DO NOTHING;

-- ============================================
-- SEED DATA: CCSS SPEAKING & LISTENING (Grades 6-8)
-- These are universal and apply to all Reverse Tutoring topics
-- ============================================

-- Grade 6 Speaking & Listening
INSERT INTO standards (id, framework_id, code, grade_band, strand, full_text, short_text, sort_order) VALUES
  ('b1000000-0000-0000-0000-000000000601', 'f1000000-0000-0000-0000-000000000001', 'SL.6.1', '6',
   'Speaking & Listening',
   'Engage effectively in a range of collaborative discussions (one-on-one, in groups, and teacher-led) with diverse partners on grade 6 topics, texts, and issues, building on others'' ideas and expressing their own clearly.',
   'Engage in collaborative discussions on grade 6 topics', 1),

  ('b1000000-0000-0000-0000-000000000602', 'f1000000-0000-0000-0000-000000000001', 'SL.6.4', '6',
   'Speaking & Listening',
   'Present claims and findings, sequencing ideas logically and using pertinent descriptions, facts, and details to accentuate main ideas or themes; use appropriate eye contact, adequate volume, and clear pronunciation.',
   'Present claims with facts and details', 2),

  ('a1000000-0000-0000-0000-000000000603', 'f1000000-0000-0000-0000-000000000001', 'SL.6.6', '6',
   'Speaking & Listening',
   'Adapt speech to a variety of contexts and tasks, demonstrating command of formal English when indicated or appropriate.',
   'Adapt speech to context and task', 3)
ON CONFLICT (framework_id, code) DO NOTHING;

-- Grade 7 Speaking & Listening
INSERT INTO standards (id, framework_id, code, grade_band, strand, full_text, short_text, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000701', 'f1000000-0000-0000-0000-000000000001', 'SL.7.1', '7',
   'Speaking & Listening',
   'Engage effectively in a range of collaborative discussions (one-on-one, in groups, and teacher-led) with diverse partners on grade 7 topics, texts, and issues, building on others'' ideas and expressing their own clearly.',
   'Engage in collaborative discussions on grade 7 topics', 1),

  ('a1000000-0000-0000-0000-000000000702', 'f1000000-0000-0000-0000-000000000001', 'SL.7.1.A', '7',
   'Speaking & Listening',
   'Come to discussions prepared, having read or researched material under study; explicitly draw on that preparation by referring to evidence on the topic, text, or issue to probe and reflect on ideas under discussion.',
   'Come prepared and use evidence', 2),

  ('a1000000-0000-0000-0000-000000000703', 'f1000000-0000-0000-0000-000000000001', 'SL.7.1.B', '7',
   'Speaking & Listening',
   'Follow rules for collegial discussions, track progress toward specific goals and deadlines, and define individual roles as needed.',
   'Follow rules for collegial discussions', 3),

  ('a1000000-0000-0000-0000-000000000704', 'f1000000-0000-0000-0000-000000000001', 'SL.7.1.C', '7',
   'Speaking & Listening',
   'Pose questions that elicit elaboration and respond to others'' questions and comments with relevant observations and ideas that bring the discussion back on topic as needed.',
   'Pose questions and respond relevantly', 4),

  ('a1000000-0000-0000-0000-000000000705', 'f1000000-0000-0000-0000-000000000001', 'SL.7.1.D', '7',
   'Speaking & Listening',
   'Acknowledge new information expressed by others and, when warranted, modify their own views.',
   'Acknowledge and integrate new information', 5),

  ('a1000000-0000-0000-0000-000000000706', 'f1000000-0000-0000-0000-000000000001', 'SL.7.4', '7',
   'Speaking & Listening',
   'Present claims and findings, emphasizing salient points in a focused, coherent manner with pertinent descriptions, facts, details, and examples; use appropriate eye contact, adequate volume, and clear pronunciation.',
   'Present claims with evidence', 6),

  ('a1000000-0000-0000-0000-000000000707', 'f1000000-0000-0000-0000-000000000001', 'SL.7.6', '7',
   'Speaking & Listening',
   'Adapt speech to a variety of contexts and tasks, demonstrating command of formal English when indicated or appropriate.',
   'Adapt speech to context', 7)
ON CONFLICT (framework_id, code) DO NOTHING;

-- Grade 8 Speaking & Listening
INSERT INTO standards (id, framework_id, code, grade_band, strand, full_text, short_text, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000801', 'f1000000-0000-0000-0000-000000000001', 'SL.8.1', '8',
   'Speaking & Listening',
   'Engage effectively in a range of collaborative discussions (one-on-one, in groups, and teacher-led) with diverse partners on grade 8 topics, texts, and issues, building on others'' ideas and expressing their own clearly.',
   'Engage in collaborative discussions on grade 8 topics', 1),

  ('a1000000-0000-0000-0000-000000000802', 'f1000000-0000-0000-0000-000000000001', 'SL.8.4', '8',
   'Speaking & Listening',
   'Present claims and findings, emphasizing salient points in a focused, coherent manner with relevant evidence, sound valid reasoning, and well-chosen details; use appropriate eye contact, adequate volume, and clear pronunciation.',
   'Present claims with evidence and reasoning', 2),

  ('a1000000-0000-0000-0000-000000000803', 'f1000000-0000-0000-0000-000000000001', 'SL.8.6', '8',
   'Speaking & Listening',
   'Adapt speech to a variety of contexts and tasks, demonstrating command of formal English when indicated or appropriate.',
   'Adapt speech to context', 3)
ON CONFLICT (framework_id, code) DO NOTHING;

-- ============================================
-- SEED DATA: NGSS SCIENCE PRACTICES
-- ============================================

INSERT INTO standards (id, framework_id, code, grade_band, strand, full_text, short_text, is_practice_standard, sort_order) VALUES
  ('a2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000004', 'SEP-6', 'K-12',
   'Science & Engineering Practices',
   'Constructing Explanations and Designing Solutions: Apply scientific ideas, principles, and/or evidence to construct, revise and/or use an explanation for real-world phenomena.',
   'Construct scientific explanations', true, 6),

  ('a2000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000004', 'SEP-7', 'K-12',
   'Science & Engineering Practices',
   'Engaging in Argument from Evidence: Construct, use, and/or present an oral and written argument or counter-arguments based on data and evidence.',
   'Engage in argument from evidence', true, 7),

  ('a2000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000004', 'SEP-8', 'K-12',
   'Science & Engineering Practices',
   'Obtaining, Evaluating, and Communicating Information: Communicate scientific and/or technical information orally and/or in writing.',
   'Communicate scientific information', true, 8)
ON CONFLICT (framework_id, code) DO NOTHING;

-- NGSS Middle School Life Science Content Standards
INSERT INTO standards (id, framework_id, code, grade_band, strand, domain, full_text, short_text, sort_order) VALUES
  ('a2000000-0000-0000-0000-000000000101', 'f1000000-0000-0000-0000-000000000004', 'MS-LS1-1', '6-8',
   'Life Science', 'From Molecules to Organisms',
   'Conduct an investigation to provide evidence that living things are made of cells; either one cell or many different numbers and types of cells.',
   'Living things are made of cells', 1),

  ('a2000000-0000-0000-0000-000000000102', 'f1000000-0000-0000-0000-000000000004', 'MS-LS1-6', '6-8',
   'Life Science', 'From Molecules to Organisms',
   'Construct a scientific explanation based on evidence for the role of photosynthesis in the cycling of matter and flow of energy into and out of organisms.',
   'Photosynthesis role in matter/energy cycling', 2),

  ('a2000000-0000-0000-0000-000000000103', 'f1000000-0000-0000-0000-000000000004', 'MS-LS1-7', '6-8',
   'Life Science', 'From Molecules to Organisms',
   'Develop a model to describe how food is rearranged through chemical reactions forming new molecules that support growth and/or release energy as this matter moves through an organism.',
   'Food provides materials for growth/energy', 3),

  ('a2000000-0000-0000-0000-000000000104', 'f1000000-0000-0000-0000-000000000004', 'MS-LS2-1', '6-8',
   'Life Science', 'Ecosystems',
   'Analyze and interpret data to provide evidence for the effects of resource availability on organisms and populations of organisms in an ecosystem.',
   'Resource effects on organisms', 4),

  ('a2000000-0000-0000-0000-000000000105', 'f1000000-0000-0000-0000-000000000004', 'MS-LS2-3', '6-8',
   'Life Science', 'Ecosystems',
   'Develop a model to describe the cycling of matter and flow of energy among living and nonliving parts of an ecosystem.',
   'Matter/energy cycling in ecosystems', 5)
ON CONFLICT (framework_id, code) DO NOTHING;

-- ============================================
-- SEED DATA: C3 FRAMEWORK (Social Studies)
-- ============================================

-- C3 Dimension 2: History
INSERT INTO standards (id, framework_id, code, grade_band, strand, domain, full_text, short_text, sort_order) VALUES
  ('a3000000-0000-0000-0000-000000000101', 'f1000000-0000-0000-0000-000000000005', 'D2.His.1.6-8', '6-8',
   'History', 'Change, Continuity, and Context',
   'Analyze connections among events and developments in broader historical contexts.',
   'Analyze connections among events', 1),

  ('a3000000-0000-0000-0000-000000000102', 'f1000000-0000-0000-0000-000000000005', 'D2.His.2.6-8', '6-8',
   'History', 'Change, Continuity, and Context',
   'Classify series of historical events and developments as examples of change and/or continuity.',
   'Classify events as change or continuity', 2),

  ('a3000000-0000-0000-0000-000000000103', 'f1000000-0000-0000-0000-000000000005', 'D2.His.3.6-8', '6-8',
   'History', 'Perspectives',
   'Use questions generated about individuals and groups to analyze why they, and the developments they shaped, are seen as historically significant.',
   'Analyze historical significance', 3),

  ('a3000000-0000-0000-0000-000000000104', 'f1000000-0000-0000-0000-000000000005', 'D2.His.14.6-8', '6-8',
   'History', 'Causation and Argumentation',
   'Explain multiple causes and effects of events and developments in the past.',
   'Explain causes and effects', 4)
ON CONFLICT (framework_id, code) DO NOTHING;

-- C3 Dimension 4: Communicating Conclusions
INSERT INTO standards (id, framework_id, code, grade_band, strand, full_text, short_text, sort_order) VALUES
  ('a3000000-0000-0000-0000-000000000201', 'f1000000-0000-0000-0000-000000000005', 'D4.1.6-8', '6-8',
   'Communicating Conclusions',
   'Construct arguments using claims and evidence from multiple sources, while acknowledging the strengths and limitations of the arguments.',
   'Construct arguments with claims and evidence', 1),

  ('a3000000-0000-0000-0000-000000000202', 'f1000000-0000-0000-0000-000000000005', 'D4.2.6-8', '6-8',
   'Communicating Conclusions',
   'Construct explanations using reasoning, correct sequence, examples, and details with relevant information and data, while acknowledging the strengths and weaknesses of the explanations.',
   'Construct explanations with reasoning', 2),

  ('a3000000-0000-0000-0000-000000000203', 'f1000000-0000-0000-0000-000000000005', 'D4.3.6-8', '6-8',
   'Communicating Conclusions',
   'Present adaptations of arguments and explanations on topics of interest to others to reach audiences and venues outside the classroom using print and oral technologies and digital technologies.',
   'Present adaptations for audiences', 3)
ON CONFLICT (framework_id, code) DO NOTHING;

-- C3 Civics
INSERT INTO standards (id, framework_id, code, grade_band, strand, domain, full_text, short_text, sort_order) VALUES
  ('a3000000-0000-0000-0000-000000000301', 'f1000000-0000-0000-0000-000000000005', 'D2.Civ.1.6-8', '6-8',
   'Civics', 'Civic and Political Institutions',
   'Distinguish the powers and responsibilities of citizens, political parties, interest groups, and the media in a variety of governmental and nongovernmental contexts.',
   'Distinguish powers of civic actors', 1),

  ('a3000000-0000-0000-0000-000000000302', 'f1000000-0000-0000-0000-000000000005', 'D2.Civ.3.6-8', '6-8',
   'Civics', 'Civic and Political Institutions',
   'Examine the origins, purposes, and impact of constitutions, laws, treaties, and international agreements.',
   'Examine constitutional documents', 2)
ON CONFLICT (framework_id, code) DO NOTHING;

-- C3 Economics
INSERT INTO standards (id, framework_id, code, grade_band, strand, domain, full_text, short_text, sort_order) VALUES
  ('a3000000-0000-0000-0000-000000000401', 'f1000000-0000-0000-0000-000000000005', 'D2.Eco.1.6-8', '6-8',
   'Economics', 'Economic Decision Making',
   'Explain how economic decisions affect the well-being of individuals, businesses, and society.',
   'Economic decisions affect well-being', 1),

  ('a3000000-0000-0000-0000-000000000402', 'f1000000-0000-0000-0000-000000000005', 'D2.Eco.2.6-8', '6-8',
   'Economics', 'Economic Decision Making',
   'Evaluate alternative approaches or solutions to current economic issues in terms of benefits and costs for different groups and society as a whole.',
   'Evaluate economic solutions', 2)
ON CONFLICT (framework_id, code) DO NOTHING;

-- C3 Geography
INSERT INTO standards (id, framework_id, code, grade_band, strand, domain, full_text, short_text, sort_order) VALUES
  ('a3000000-0000-0000-0000-000000000501', 'f1000000-0000-0000-0000-000000000005', 'D2.Geo.1.6-8', '6-8',
   'Geography', 'Geographic Representations',
   'Construct maps to represent and explain the spatial patterns of cultural and environmental characteristics.',
   'Construct maps of spatial patterns', 1),

  ('a3000000-0000-0000-0000-000000000502', 'f1000000-0000-0000-0000-000000000005', 'D2.Geo.4.6-8', '6-8',
   'Geography', 'Human-Environment Interaction',
   'Explain how cultural patterns and economic decisions influence environments and the daily lives of people in both nearby and distant places.',
   'Cultural patterns influence environments', 2)
ON CONFLICT (framework_id, code) DO NOTHING;

-- ============================================
-- SEED DATA: CCSS MATH PRACTICES
-- ============================================

INSERT INTO standards (id, framework_id, code, grade_band, strand, full_text, short_text, is_practice_standard, sort_order) VALUES
  ('a4000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000003', 'MP.1', 'K-12',
   'Mathematical Practices',
   'Make sense of problems and persevere in solving them. Mathematically proficient students start by explaining to themselves the meaning of a problem and looking for entry points to its solution.',
   'Make sense of problems', true, 1),

  ('a4000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000003', 'MP.3', 'K-12',
   'Mathematical Practices',
   'Construct viable arguments and critique the reasoning of others. Mathematically proficient students understand and use stated assumptions, definitions, and previously established results in constructing arguments.',
   'Construct viable arguments', true, 3),

  ('a4000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000003', 'MP.6', 'K-12',
   'Mathematical Practices',
   'Attend to precision. Mathematically proficient students try to communicate precisely to others. They state the meaning of the symbols they choose and are careful about specifying units of measure and labeling axes.',
   'Attend to precision', true, 6)
ON CONFLICT (framework_id, code) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE standards_frameworks IS 'Educational standards frameworks (Common Core, NGSS, C3, etc.)';
COMMENT ON TABLE standards IS 'Individual standards within each framework';
COMMENT ON TABLE topic_standards IS 'Links reverse tutoring topics to educational standards';
COMMENT ON COLUMN standards_frameworks.is_universal IS 'True for Speaking & Listening - applies to all subjects';
COMMENT ON COLUMN standards.is_practice_standard IS 'True for practice standards (MP, SEP) vs content standards';
