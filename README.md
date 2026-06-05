# 📡 Tactical Radio & Frequency Management
A mission-critical web platform designed for the operational management of radio frequencies, communication devices, and tactical missions across multi-sector deployments.

## 🎯 The Operational Challenge
Managing large-scale radio deployments is highly complex and sensitive to errors. Traditional management relies on disconnected local files, manual device allocation is slow, 
and there is a lack of transparency regarding configuration changes. This platform solves these issues by providing a centralized, automated, and secure command and control interface.

## ✨ Key Features

### 🏗️ Object-Oriented Deployment Data

* **Three-Tier Hierarchy:** Devices are meticulously organized into a geographical structure: Sector ➔ Site ➔ Radio Device.

* **Meaningful References:** Owners, missions, and frequencies are stored as linked database references, ensuring data integrity rather than relying on raw text strings.


### 📊 Centralized Command Dashboard

* **Unified View:** Displays both the current operational status and standby configurations side-by-side in a single table.

* **Inline Editing:** Double-click any cell to instantly edit frequencies, owners, missions, roles, and statuses directly from the grid.

* **Conflict Detection:** Automatically highlights duplicate frequencies within the same site to prevent operational interference.

* **Rapid Swapping:** Includes a dedicated button to instantly swap a device's current state with its standby state.

* **Owner Color-Coding:** Visually identifies device ownership by applying unique colors to specific rows.



### 📖 Link Dictionary

* **Frequency Mapping:** Maps numerical frequencies directly to their operational link names.

* **Smart Auto-Complete:** Typing a link name in any frequency field automatically suggests the correct numerical frequency.

* **Bulk Import:** Supports importing hundreds of links via Excel, including automatic frequency band recognition and owner validation.



### 🚀 Intelligent Mission Management

* **Automated Allocation:** Define the requirements, and the system automatically searches for and allocates available devices based on the current deployment.

* **Full Lifecycle Tracking:** Manages missions through Planning, Allocation, Standby, Completion (which automatically frees up the devices), and Archive.

* **Gantt Chart Timeline:** Visualizes all active missions on a timeline, using width for duration and colors for owners, to easily identify overlaps and loads.



### 🔎 Search, Filters & Analytics

* **Live Search:** Instantly search across frequencies, owners, missions, device types, and notes simultaneously.

* **Advanced Filtering:** Filter deployment views by allocation state (current/standby), specific missions, or device usability status.

* **Visual Analytics:** Real-time dashboard featuring total metrics, a device health pie chart, mission coverage distributions, and site utilization tables.



### 🛡️ Security & Audit Trail

* **Comprehensive History:** Every creation, update, and deletion is automatically logged with exact before/after comparisons and relative timestamps.

* **Role-Based Access Control (RBAC):** Supports Admin (full edit access), User (can manage their specific group/owner), and Viewer (read-only) roles.

* **Auto-Logout:** Automatically disconnects users after 8 hours of inactivity to maintain operational security.



### ⚙️ User Experience & Infrastructure

* **Zero Cloud Dependency:** Runs entirely on a local server, ensuring security and availability without requiring an external internet connection.

* **Tech Stack:** Powered by a lightweight Python HTTP server with a single-file database, paired with a pure HTML/CSS/Vanilla JS frontend.

* **Live Sync:** Changes made by one user automatically sync to all other connected users within 10 seconds.

* **Customization:** Features a Dark/Light mode toggle, full UI control over frequency bands and device types, and built-in JSON backup export.
