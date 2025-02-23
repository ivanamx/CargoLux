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

--
-- Data for Name: attendances; Type: TABLE DATA; Schema: public; Owner: ivanam
--



--
-- Data for Name: certifications; Type: TABLE DATA; Schema: public; Owner: ivanam
--



--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: ivanam
--

INSERT INTO public.companies (id, name, created_at) VALUES (1, 'APIZHE', '2025-02-18 16:41:38.219624');


--
-- Data for Name: location_history; Type: TABLE DATA; Schema: public; Owner: ivanam
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: ivanam
--



--
-- Data for Name: performance_evaluations; Type: TABLE DATA; Schema: public; Owner: ivanam
--



--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: ivanam
--



--
-- Data for Name: project_assignments; Type: TABLE DATA; Schema: public; Owner: ivanam
--



--
-- Data for Name: project_documents; Type: TABLE DATA; Schema: public; Owner: ivanam
--



--
-- Data for Name: project_equipment; Type: TABLE DATA; Schema: public; Owner: ivanam
--



--
-- Data for Name: project_locations; Type: TABLE DATA; Schema: public; Owner: ivanam
--



--
-- Data for Name: time_entries; Type: TABLE DATA; Schema: public; Owner: ivanam
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: ivanam
--

INSERT INTO public.users (id, email, username, full_name, avatar, hashed_password, role, status, location, phone, is_active, company_id, created_at, push_subscription, personal_info, employment_info, statistics, hr_info, performance, incidents) VALUES (15, 'admin@apizhe.com', 'admin@apizhe.com', 'Admin User', NULL, '$2b$12$1FBArf46s5uOjvs/Q45erOUWR15qNYuHVBSeieduGJ6JsHr3QlP2C', 'admin', 'activo', NULL, NULL, true, 1, '2025-02-19 01:01:43.987406', NULL, '{"curp": "", "rfc": "", "birth_date": "", "address": "", "emergency_contact": {"name": "", "phone": "", "relation": ""}}', '{"start_date": "", "last_contract_renewal": "", "contract_file": "", "position": "", "supervisor": "", "certifications": []}', '{"total_hours": 0, "total_services": 0, "avg_monthly_hours": 0, "success_rate": 0, "incidents": 0}', '{"salary": {"base": 0, "last_increase": "", "next_review_date": ""}, "benefits": [], "vacations": {"days_total": 0, "days_used": 0, "next_vacation_date": "", "history": []}, "documents": []}', '{"last_evaluation": {"date": "", "score": 0, "evaluator": "", "comments": ""}, "skills": [], "certifications": [], "trainings": []}', '[]');
INSERT INTO public.users (id, email, username, full_name, avatar, hashed_password, role, status, location, phone, is_active, company_id, created_at, push_subscription, personal_info, employment_info, statistics, hr_info, performance, incidents) VALUES (16, 'tech@apizhe.com', 'tech@apizhe.com', 'T├⌐cnico Prueba', NULL, '$2b$12$oHLFnrpnsY47.aRZkJnwFObcsvYDGDUIquIqSK64gBjfg.LyKpfhK', 'employee', 'activo', NULL, NULL, true, 1, '2025-02-19 01:01:43.987406', NULL, '{"curp": "", "rfc": "", "birth_date": "", "address": "", "emergency_contact": {"name": "", "phone": "", "relation": ""}}', '{"start_date": "", "last_contract_renewal": "", "contract_file": "", "position": "", "supervisor": "", "certifications": []}', '{"total_hours": 0, "total_services": 0, "avg_monthly_hours": 0, "success_rate": 0, "incidents": 0}', '{"salary": {"base": 0, "last_increase": "", "next_review_date": ""}, "benefits": [], "vacations": {"days_total": 0, "days_used": 0, "next_vacation_date": "", "history": []}, "documents": []}', '{"last_evaluation": {"date": "", "score": 0, "evaluator": "", "comments": ""}, "skills": [], "certifications": [], "trainings": []}', '[]');
INSERT INTO public.users (id, email, username, full_name, avatar, hashed_password, role, status, location, phone, is_active, company_id, created_at, push_subscription, personal_info, employment_info, statistics, hr_info, performance, incidents) VALUES (17, 'admin@example.com', NULL, 'Admin User', NULL, '$2b$12$qXQQFRUCfupL/0.VPquEEOjhg4xY.uGVEFo0UCF7UB0ghke01g7F.', NULL, NULL, NULL, NULL, true, NULL, '2025-02-22 03:06:31.550805', NULL, '{"curp": "", "rfc": "", "birth_date": "", "address": "", "emergency_contact": {"name": "", "phone": "", "relation": ""}}', '{"start_date": "", "last_contract_renewal": "", "contract_file": "", "position": "", "supervisor": "", "certifications": []}', '{"total_hours": 0, "total_services": 0, "avg_monthly_hours": 0, "success_rate": 0, "incidents": 0}', '{"salary": {"base": 0, "last_increase": "", "next_review_date": ""}, "benefits": [], "vacations": {"days_total": 0, "days_used": 0, "next_vacation_date": "", "history": []}, "documents": []}', '{"last_evaluation": {"date": "", "score": 0, "evaluator": "", "comments": ""}, "skills": [], "certifications": [], "trainings": []}', '[]');


--
-- Data for Name: vacation_history; Type: TABLE DATA; Schema: public; Owner: ivanam
--



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
-- PostgreSQL database dump complete
--

