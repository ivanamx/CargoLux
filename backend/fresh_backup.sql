--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4
-- Dumped by pg_dump version 16.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE IF EXISTS controlasist;
--
-- Name: controlasist; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE controlasist WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'English_United States.1252';


ALTER DATABASE controlasist OWNER TO postgres;

\connect controlasist

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendances; Type: TABLE; Schema: public; Owner: ivanam
--

CREATE TABLE public.attendances (
    id integer NOT NULL,
    user_id integer,
    check_in timestamp without time zone,
    check_out timestamp without time zone,
    latitude double precision,
    longitude double precision,
    created_at timestamp without time zone
);


ALTER TABLE public.attendances OWNER TO ivanam;

--
-- Name: attendances_id_seq; Type: SEQUENCE; Schema: public; Owner: ivanam
--

CREATE SEQUENCE public.attendances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendances_id_seq OWNER TO ivanam;

--
-- Name: attendances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ivanam
--

ALTER SEQUENCE public.attendances_id_seq OWNED BY public.attendances.id;


--
-- Name: certifications; Type: TABLE; Schema: public; Owner: ivanam
--

CREATE TABLE public.certifications (
    id integer NOT NULL,
    user_id integer,
    name character varying,
    issue_date timestamp without time zone,
    expiry_date timestamp without time zone,
    status character varying,
    document_url character varying
);


ALTER TABLE public.certifications OWNER TO ivanam;

--
-- Name: certifications_id_seq; Type: SEQUENCE; Schema: public; Owner: ivanam
--

CREATE SEQUENCE public.certifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.certifications_id_seq OWNER TO ivanam;

--
-- Name: certifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ivanam
--

ALTER SEQUENCE public.certifications_id_seq OWNED BY public.certifications.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: ivanam
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying,
    created_at timestamp without time zone
);


ALTER TABLE public.companies OWNER TO ivanam;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: ivanam
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO ivanam;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ivanam
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: location_history; Type: TABLE; Schema: public; Owner: ivanam
--

CREATE TABLE public.location_history (
    id integer NOT NULL,
    attendance_id integer,
    latitude double precision,
    longitude double precision,
    "timestamp" timestamp without time zone,
    status character varying
);


ALTER TABLE public.location_history OWNER TO ivanam;

--
-- Name: location_history_id_seq; Type: SEQUENCE; Schema: public; Owner: ivanam
--

CREATE SEQUENCE public.location_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.location_history_id_seq OWNER TO ivanam;

--
-- Name: location_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ivanam
--

ALTER SEQUENCE public.location_history_id_seq OWNED BY public.location_history.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: ivanam
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    type character varying,
    message text,
    read boolean,
    created_at timestamp without time zone
);


ALTER TABLE public.notifications OWNER TO ivanam;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: ivanam
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO ivanam;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ivanam
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: performance_evaluations; Type: TABLE; Schema: public; Owner: ivanam
--

CREATE TABLE public.performance_evaluations (
    id integer NOT NULL,
    user_id integer,
    evaluator_id integer,
    score double precision,
    comments text,
    evaluation_date timestamp without time zone,
    next_review_date timestamp without time zone
);


ALTER TABLE public.performance_evaluations OWNER TO ivanam;

--
-- Name: performance_evaluations_id_seq; Type: SEQUENCE; Schema: public; Owner: ivanam
--

CREATE SEQUENCE public.performance_evaluations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.performance_evaluations_id_seq OWNER TO ivanam;

--
-- Name: performance_evaluations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ivanam
--

ALTER SEQUENCE public.performance_evaluations_id_seq OWNED BY public.performance_evaluations.id;


--
-- Name: project_assignments; Type: TABLE; Schema: public; Owner: ivanam
--

CREATE TABLE public.project_assignments (
    id integer NOT NULL,
    project_id integer,
    user_id integer,
    role character varying,
    created_at timestamp without time zone
);


ALTER TABLE public.project_assignments OWNER TO ivanam;

--
-- Name: project_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: ivanam
--

CREATE SEQUENCE public.project_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_assignments_id_seq OWNER TO ivanam;

--
-- Name: project_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ivanam
--

ALTER SEQUENCE public.project_assignments_id_seq OWNED BY public.project_assignments.id;


--
-- Name: project_documents; Type: TABLE; Schema: public; Owner: ivanam
--

CREATE TABLE public.project_documents (
    id integer NOT NULL,
    project_id integer,
    name character varying,
    type character varying,
    url character varying,
    size integer,
    created_at timestamp without time zone
);


ALTER TABLE public.project_documents OWNER TO ivanam;

--
-- Name: project_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: ivanam
--

CREATE SEQUENCE public.project_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_documents_id_seq OWNER TO ivanam;

--
-- Name: project_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ivanam
--

ALTER SEQUENCE public.project_documents_id_seq OWNED BY public.project_documents.id;


--
-- Name: project_equipment; Type: TABLE; Schema: public; Owner: ivanam
--

CREATE TABLE public.project_equipment (
    id integer NOT NULL,
    project_id integer,
    name character varying,
    created_at timestamp without time zone
);


ALTER TABLE public.project_equipment OWNER TO ivanam;

--
-- Name: project_equipment_id_seq; Type: SEQUENCE; Schema: public; Owner: ivanam
--

CREATE SEQUENCE public.project_equipment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_equipment_id_seq OWNER TO ivanam;

--
-- Name: project_equipment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ivanam
--

ALTER SEQUENCE public.project_equipment_id_seq OWNED BY public.project_equipment.id;


--
-- Name: project_locations; Type: TABLE; Schema: public; Owner: ivanam
--

CREATE TABLE public.project_locations (
    id integer NOT NULL,
    project_id integer,
    plant_address character varying,
    plant_coordinates character varying,
    contact_name character varying,
    contact_phone character varying,
    contact_email character varying,
    hotel_name character varying,
    hotel_address character varying,
    hotel_coordinates character varying,
    hotel_phone character varying
);


ALTER TABLE public.project_locations OWNER TO ivanam;

--
-- Name: project_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: ivanam
--

CREATE SEQUENCE public.project_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_locations_id_seq OWNER TO ivanam;

--
-- Name: project_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ivanam
--

ALTER SEQUENCE public.project_locations_id_seq OWNED BY public.project_locations.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: ivanam
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    name character varying,
    description text,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    status character varying,
    company_id integer,
    created_at timestamp without time zone
);


ALTER TABLE public.projects OWNER TO ivanam;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: ivanam
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO ivanam;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ivanam
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: time_entries; Type: TABLE; Schema: public; Owner: ivanam
--

CREATE TABLE public.time_entries (
    id integer NOT NULL,
    user_id integer,
    project_id integer,
    description text,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    duration double precision,
    created_at timestamp without time zone
);


ALTER TABLE public.time_entries OWNER TO ivanam;

--
-- Name: time_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: ivanam
--

CREATE SEQUENCE public.time_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.time_entries_id_seq OWNER TO ivanam;

--
-- Name: time_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ivanam
--

ALTER SEQUENCE public.time_entries_id_seq OWNED BY public.time_entries.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: ivanam
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying,
    username character varying,
    full_name character varying,
    avatar character varying,
    hashed_password character varying,
    role character varying,
    status character varying,
    location character varying,
    phone character varying,
    is_active boolean,
    company_id integer,
    created_at timestamp without time zone,
    push_subscription character varying,
    personal_info json,
    employment_info json,
    statistics json,
    hr_info json,
    performance json,
    incidents json
);


ALTER TABLE public.users OWNER TO ivanam;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: ivanam
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO ivanam;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ivanam
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vacation_history; Type: TABLE; Schema: public; Owner: ivanam
--

CREATE TABLE public.vacation_history (
    id integer NOT NULL,
    user_id integer,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    days integer,
    status character varying,
    approved_by_id integer
);


ALTER TABLE public.vacation_history OWNER TO ivanam;

--
-- Name: vacation_history_id_seq; Type: SEQUENCE; Schema: public; Owner: ivanam
--

CREATE SEQUENCE public.vacation_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vacation_history_id_seq OWNER TO ivanam;

--
-- Name: vacation_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ivanam
--

ALTER SEQUENCE public.vacation_history_id_seq OWNED BY public.vacation_history.id;


--
-- Name: attendances id; Type: DEFAULT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.attendances ALTER COLUMN id SET DEFAULT nextval('public.attendances_id_seq'::regclass);


--
-- Name: certifications id; Type: DEFAULT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.certifications ALTER COLUMN id SET DEFAULT nextval('public.certifications_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: location_history id; Type: DEFAULT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.location_history ALTER COLUMN id SET DEFAULT nextval('public.location_history_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: performance_evaluations id; Type: DEFAULT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.performance_evaluations ALTER COLUMN id SET DEFAULT nextval('public.performance_evaluations_id_seq'::regclass);


--
-- Name: project_assignments id; Type: DEFAULT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.project_assignments ALTER COLUMN id SET DEFAULT nextval('public.project_assignments_id_seq'::regclass);


--
-- Name: project_documents id; Type: DEFAULT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.project_documents ALTER COLUMN id SET DEFAULT nextval('public.project_documents_id_seq'::regclass);


--
-- Name: project_equipment id; Type: DEFAULT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.project_equipment ALTER COLUMN id SET DEFAULT nextval('public.project_equipment_id_seq'::regclass);


--
-- Name: project_locations id; Type: DEFAULT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.project_locations ALTER COLUMN id SET DEFAULT nextval('public.project_locations_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: time_entries id; Type: DEFAULT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.time_entries ALTER COLUMN id SET DEFAULT nextval('public.time_entries_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vacation_history id; Type: DEFAULT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.vacation_history ALTER COLUMN id SET DEFAULT nextval('public.vacation_history_id_seq'::regclass);


--
-- Data for Name: attendances; Type: TABLE DATA; Schema: public; Owner: ivanam
--

COPY public.attendances (id, user_id, check_in, check_out, latitude, longitude, created_at) FROM stdin;
\.


--
-- Data for Name: certifications; Type: TABLE DATA; Schema: public; Owner: ivanam
--

COPY public.certifications (id, user_id, name, issue_date, expiry_date, status, document_url) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: ivanam
--

COPY public.companies (id, name, created_at) FROM stdin;
1	APIZHE	2025-02-18 16:41:38.219624
\.


--
-- Data for Name: location_history; Type: TABLE DATA; Schema: public; Owner: ivanam
--

COPY public.location_history (id, attendance_id, latitude, longitude, "timestamp", status) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: ivanam
--

COPY public.notifications (id, user_id, type, message, read, created_at) FROM stdin;
\.


--
-- Data for Name: performance_evaluations; Type: TABLE DATA; Schema: public; Owner: ivanam
--

COPY public.performance_evaluations (id, user_id, evaluator_id, score, comments, evaluation_date, next_review_date) FROM stdin;
\.


--
-- Data for Name: project_assignments; Type: TABLE DATA; Schema: public; Owner: ivanam
--

COPY public.project_assignments (id, project_id, user_id, role, created_at) FROM stdin;
\.


--
-- Data for Name: project_documents; Type: TABLE DATA; Schema: public; Owner: ivanam
--

COPY public.project_documents (id, project_id, name, type, url, size, created_at) FROM stdin;
\.


--
-- Data for Name: project_equipment; Type: TABLE DATA; Schema: public; Owner: ivanam
--

COPY public.project_equipment (id, project_id, name, created_at) FROM stdin;
\.


--
-- Data for Name: project_locations; Type: TABLE DATA; Schema: public; Owner: ivanam
--

COPY public.project_locations (id, project_id, plant_address, plant_coordinates, contact_name, contact_phone, contact_email, hotel_name, hotel_address, hotel_coordinates, hotel_phone) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: ivanam
--

COPY public.projects (id, name, description, start_date, end_date, status, company_id, created_at) FROM stdin;
\.


--
-- Data for Name: time_entries; Type: TABLE DATA; Schema: public; Owner: ivanam
--

COPY public.time_entries (id, user_id, project_id, description, start_time, end_time, duration, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: ivanam
--

COPY public.users (id, email, username, full_name, avatar, hashed_password, role, status, location, phone, is_active, company_id, created_at, push_subscription, personal_info, employment_info, statistics, hr_info, performance, incidents) FROM stdin;
15	admin@apizhe.com	admin@apizhe.com	Admin User	\N	$2b$12$1FBArf46s5uOjvs/Q45erOUWR15qNYuHVBSeieduGJ6JsHr3QlP2C	admin	activo	\N	\N	t	1	2025-02-19 01:01:43.987406	\N	{"curp": "", "rfc": "", "birth_date": "", "address": "", "emergency_contact": {"name": "", "phone": "", "relation": ""}}	{"start_date": "", "last_contract_renewal": "", "contract_file": "", "position": "", "supervisor": "", "certifications": []}	{"total_hours": 0, "total_services": 0, "avg_monthly_hours": 0, "success_rate": 0, "incidents": 0}	{"salary": {"base": 0, "last_increase": "", "next_review_date": ""}, "benefits": [], "vacations": {"days_total": 0, "days_used": 0, "next_vacation_date": "", "history": []}, "documents": []}	{"last_evaluation": {"date": "", "score": 0, "evaluator": "", "comments": ""}, "skills": [], "certifications": [], "trainings": []}	[]
16	tech@apizhe.com	tech@apizhe.com	T├⌐cnico Prueba	\N	$2b$12$oHLFnrpnsY47.aRZkJnwFObcsvYDGDUIquIqSK64gBjfg.LyKpfhK	employee	activo	\N	\N	t	1	2025-02-19 01:01:43.987406	\N	{"curp": "", "rfc": "", "birth_date": "", "address": "", "emergency_contact": {"name": "", "phone": "", "relation": ""}}	{"start_date": "", "last_contract_renewal": "", "contract_file": "", "position": "", "supervisor": "", "certifications": []}	{"total_hours": 0, "total_services": 0, "avg_monthly_hours": 0, "success_rate": 0, "incidents": 0}	{"salary": {"base": 0, "last_increase": "", "next_review_date": ""}, "benefits": [], "vacations": {"days_total": 0, "days_used": 0, "next_vacation_date": "", "history": []}, "documents": []}	{"last_evaluation": {"date": "", "score": 0, "evaluator": "", "comments": ""}, "skills": [], "certifications": [], "trainings": []}	[]
17	admin@example.com	\N	Admin User	\N	$2b$12$qXQQFRUCfupL/0.VPquEEOjhg4xY.uGVEFo0UCF7UB0ghke01g7F.	\N	\N	\N	\N	t	\N	2025-02-22 03:06:31.550805	\N	{"curp": "", "rfc": "", "birth_date": "", "address": "", "emergency_contact": {"name": "", "phone": "", "relation": ""}}	{"start_date": "", "last_contract_renewal": "", "contract_file": "", "position": "", "supervisor": "", "certifications": []}	{"total_hours": 0, "total_services": 0, "avg_monthly_hours": 0, "success_rate": 0, "incidents": 0}	{"salary": {"base": 0, "last_increase": "", "next_review_date": ""}, "benefits": [], "vacations": {"days_total": 0, "days_used": 0, "next_vacation_date": "", "history": []}, "documents": []}	{"last_evaluation": {"date": "", "score": 0, "evaluator": "", "comments": ""}, "skills": [], "certifications": [], "trainings": []}	[]
\.


--
-- Data for Name: vacation_history; Type: TABLE DATA; Schema: public; Owner: ivanam
--

COPY public.vacation_history (id, user_id, start_date, end_date, days, status, approved_by_id) FROM stdin;
\.


--
-- Name: attendances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ivanam
--

SELECT pg_catalog.setval('public.attendances_id_seq', 1, false);


--
-- Name: certifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ivanam
--

SELECT pg_catalog.setval('public.certifications_id_seq', 1, false);


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ivanam
--

SELECT pg_catalog.setval('public.companies_id_seq', 1, true);


--
-- Name: location_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ivanam
--

SELECT pg_catalog.setval('public.location_history_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ivanam
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: performance_evaluations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ivanam
--

SELECT pg_catalog.setval('public.performance_evaluations_id_seq', 1, false);


--
-- Name: project_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ivanam
--

SELECT pg_catalog.setval('public.project_assignments_id_seq', 1, false);


--
-- Name: project_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ivanam
--

SELECT pg_catalog.setval('public.project_documents_id_seq', 1, false);


--
-- Name: project_equipment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ivanam
--

SELECT pg_catalog.setval('public.project_equipment_id_seq', 1, false);


--
-- Name: project_locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ivanam
--

SELECT pg_catalog.setval('public.project_locations_id_seq', 1, false);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ivanam
--

SELECT pg_catalog.setval('public.projects_id_seq', 1, false);


--
-- Name: time_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ivanam
--

SELECT pg_catalog.setval('public.time_entries_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ivanam
--

SELECT pg_catalog.setval('public.users_id_seq', 17, true);


--
-- Name: vacation_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ivanam
--

SELECT pg_catalog.setval('public.vacation_history_id_seq', 1, false);


--
-- Name: attendances attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_pkey PRIMARY KEY (id);


--
-- Name: certifications certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: location_history location_history_pkey; Type: CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.location_history
    ADD CONSTRAINT location_history_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: performance_evaluations performance_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.performance_evaluations
    ADD CONSTRAINT performance_evaluations_pkey PRIMARY KEY (id);


--
-- Name: project_assignments project_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_pkey PRIMARY KEY (id);


--
-- Name: project_documents project_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_pkey PRIMARY KEY (id);


--
-- Name: project_equipment project_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.project_equipment
    ADD CONSTRAINT project_equipment_pkey PRIMARY KEY (id);


--
-- Name: project_locations project_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.project_locations
    ADD CONSTRAINT project_locations_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: time_entries time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vacation_history vacation_history_pkey; Type: CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.vacation_history
    ADD CONSTRAINT vacation_history_pkey PRIMARY KEY (id);


--
-- Name: ix_attendances_id; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE INDEX ix_attendances_id ON public.attendances USING btree (id);


--
-- Name: ix_certifications_id; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE INDEX ix_certifications_id ON public.certifications USING btree (id);


--
-- Name: ix_companies_id; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE INDEX ix_companies_id ON public.companies USING btree (id);


--
-- Name: ix_companies_name; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE UNIQUE INDEX ix_companies_name ON public.companies USING btree (name);


--
-- Name: ix_location_history_id; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE INDEX ix_location_history_id ON public.location_history USING btree (id);


--
-- Name: ix_notifications_id; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE INDEX ix_notifications_id ON public.notifications USING btree (id);


--
-- Name: ix_performance_evaluations_id; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE INDEX ix_performance_evaluations_id ON public.performance_evaluations USING btree (id);


--
-- Name: ix_project_assignments_id; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE INDEX ix_project_assignments_id ON public.project_assignments USING btree (id);


--
-- Name: ix_project_documents_id; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE INDEX ix_project_documents_id ON public.project_documents USING btree (id);


--
-- Name: ix_project_equipment_id; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE INDEX ix_project_equipment_id ON public.project_equipment USING btree (id);


--
-- Name: ix_project_locations_id; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE INDEX ix_project_locations_id ON public.project_locations USING btree (id);


--
-- Name: ix_projects_id; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE INDEX ix_projects_id ON public.projects USING btree (id);


--
-- Name: ix_time_entries_id; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE INDEX ix_time_entries_id ON public.time_entries USING btree (id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: ix_vacation_history_id; Type: INDEX; Schema: public; Owner: ivanam
--

CREATE INDEX ix_vacation_history_id ON public.vacation_history USING btree (id);


--
-- Name: location_history location_history_attendance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.location_history
    ADD CONSTRAINT location_history_attendance_id_fkey FOREIGN KEY (attendance_id) REFERENCES public.attendances(id);


--
-- Name: project_assignments project_assignments_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: project_documents project_documents_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: project_equipment project_equipment_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.project_equipment
    ADD CONSTRAINT project_equipment_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: project_locations project_locations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.project_locations
    ADD CONSTRAINT project_locations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: projects projects_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: time_entries time_entries_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ivanam
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: DATABASE controlasist; Type: ACL; Schema: -; Owner: postgres
--

GRANT ALL ON DATABASE controlasist TO ivanam;


--
-- PostgreSQL database dump complete
--

