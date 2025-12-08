"""
Compliance Checking Example

Demonstrates running ABC compliance checks including:
- ABC: AI Behavior Compliance (custom framework)
- SOC2: Security and availability controls
- GDPR: Data privacy regulations
- EU AI Act: EU AI regulations compliance
"""

import asyncio
import os
from dotenv import load_dotenv

from evaris_client import (
    EvarisClient,
    ComplianceFramework,
    ComplianceStatus,
)

load_dotenv()


def status_emoji(status: ComplianceStatus) -> str:
    """Return status indicator (using ASCII for CLAUDE.md compliance)."""
    mapping = {
        ComplianceStatus.COMPLIANT: "[OK]",
        ComplianceStatus.WARNING: "[!!]",
        ComplianceStatus.VIOLATION: "[XX]",
        ComplianceStatus.UNCHECKED: "[--]",
    }
    return mapping.get(status, "[??]")


async def main():
    client = EvarisClient(
        api_key=os.getenv("EVARIS_API_KEY"),
        base_url=os.getenv("EVARIS_BASE_URL", "http://localhost:4000"),
    )

    async with client:
        project_id = "proj_example"  # Replace with your project ID

        # Run compliance check for specific frameworks
        print("Running compliance checks...")
        print("=" * 60)

        # Check all frameworks
        results = await client.check_compliance(
            project_id=project_id,
            frameworks=[
                ComplianceFramework.ABC,
                ComplianceFramework.SOC2,
                ComplianceFramework.GDPR,
                ComplianceFramework.EU_AI_ACT,
            ],
        )

        # Display results by framework
        for check in results:
            status = status_emoji(check.status)
            print(f"\n{status} {check.framework.value}")
            print(f"  Overall Status: {check.status.value}")
            print(f"  Score: {check.score:.1%}")
            print(f"  Rules: {check.passed_rules}/{check.total_rules} passed")

            if check.warning_rules > 0:
                print(f"  Warnings: {check.warning_rules}")
            if check.violation_rules > 0:
                print(f"  Violations: {check.violation_rules}")

            # Show individual rules
            print(f"\n  Rule Details:")
            for rule in check.rules:
                rule_status = status_emoji(rule.status)
                print(f"    {rule_status} {rule.name}")

                if rule.score is not None:
                    print(f"        Score: {rule.score:.2f}")
                if rule.reasoning:
                    print(f"        Reason: {rule.reasoning[:80]}...")
                if rule.suggestion and rule.status != ComplianceStatus.COMPLIANT:
                    print(f"        Suggestion: {rule.suggestion[:80]}...")

        # Get current compliance status (without running new checks)
        print("\n" + "=" * 60)
        print("Current Compliance Status (cached):")
        print("=" * 60)

        status_results = await client.get_compliance_status(project_id)

        for check in status_results:
            print(f"\n{check.framework.value}: {check.status.value} ({check.score:.1%})")
            print(f"  Last checked: {check.checked_at.strftime('%Y-%m-%d %H:%M:%S')}")

        # Check specific entity (e.g., a specific eval)
        print("\n" + "=" * 60)
        print("Entity-specific Compliance Check:")
        print("=" * 60)

        entity_results = await client.check_compliance(
            project_id=project_id,
            frameworks=[ComplianceFramework.ABC],  # Just ABC for a specific eval
            entity_type="eval",
            entity_id="eval_example",  # Replace with actual eval ID
        )

        for check in entity_results:
            print(f"\n{check.framework.value} for eval_example:")
            print(f"  Status: {check.status.value}")
            print(f"  Score: {check.score:.1%}")


async def demonstrate_compliance_rules():
    """Show what each framework checks for."""
    print("\n" + "=" * 60)
    print("ABC COMPLIANCE FRAMEWORK RULES")
    print("=" * 60)

    frameworks = {
        "ABC (AI Behavior Compliance)": [
            "Output Safety: No harmful, toxic, or dangerous content",
            "Hallucination Control: Factual accuracy and grounding",
            "Bias Detection: Fair treatment across demographics",
            "Consistency: Stable responses for similar queries",
            "Transparency: Clear AI disclosure and limitations",
        ],
        "SOC2": [
            "Data Encryption: At-rest and in-transit encryption",
            "Access Controls: Authentication and authorization",
            "Audit Logging: Complete activity trails",
            "Incident Response: Breach detection and response",
            "Data Retention: Proper data lifecycle management",
        ],
        "GDPR": [
            "Consent Management: Proper data processing consent",
            "Data Subject Rights: Access, deletion, portability",
            "Data Minimization: Only necessary data collected",
            "Purpose Limitation: Data used only as stated",
            "Privacy by Design: Built-in privacy protections",
        ],
        "EU AI Act": [
            "Risk Classification: Proper AI system categorization",
            "Transparency: Clear AI system disclosure",
            "Human Oversight: Human-in-the-loop mechanisms",
            "Accuracy: Documented performance metrics",
            "Robustness: Security and reliability measures",
        ],
    }

    for framework, rules in frameworks.items():
        print(f"\n{framework}:")
        for rule in rules:
            print(f"  - {rule}")


if __name__ == "__main__":
    asyncio.run(main())
    asyncio.run(demonstrate_compliance_rules())
