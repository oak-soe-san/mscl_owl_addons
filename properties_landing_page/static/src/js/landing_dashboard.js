/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { Component, useState, onWillStart } from "@odoo/owl";

/**
 * PropertiesLandingDashboard
 * 
 * Main component for the properties landing page that displays
 * all installed modules in a visually appealing grid layout
 */
class PropertiesLandingDashboard extends Component {
    setup() {
        this.rpc = useService("rpc");
        this.state = useState({ 
            modules: [],
            isLoading: true,
            error: null
        });

        onWillStart(async () => {
            try {
                const modules = await this.rpc("/properties_landing_page/modules");
                this.state.modules = modules || [];
            } catch (error) {
                console.error("Failed to load modules:", error);
                this.state.error = "Could not load modules. Please try again later.";
            } finally {
                this.state.isLoading = false;
            }
        });
    }

    /**
     * Navigate to a module when clicked
     */
    navigateToModule(url) {
        if (url) {
            window.location.href = url;
        }
    }
}

// Define the template name
PropertiesLandingDashboard.template = "properties_landing_page.LandingDashboard";

// Add the component to Owl's registry
registry.category("public_components").add("PropertiesLandingDashboard", PropertiesLandingDashboard);

// Setup DOM mounting when the document is ready
document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("properties-landing-dashboard");
    if (root) {
        const { mount } = owl;
        const env = { services: registry.category("services").getEntries() };
        mount(PropertiesLandingDashboard, { target: root, env });
    }
});

export default PropertiesLandingDashboard;
