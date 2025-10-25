import * as fs from 'fs';
import * as path from 'path';

export interface ReportSection {
  title: string;
  findings: Finding[];
}

export interface Finding {
  type: 'pass' | 'fail' | 'warning';
  category: string;
  description: string;
  details?: string;
  screenshot?: string;
  measurements?: Record<string, number | string>;
}

export class MobileAuditReport {
  private sections: ReportSection[] = [];
  private reportPath: string;

  constructor() {
    const reportDir = path.join(process.cwd(), 'test-results', 'mobile-audit');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    this.reportPath = path.join(reportDir, 'mobile-audit-report.md');
  }

  addSection(section: ReportSection) {
    this.sections.push(section);
  }

  addFinding(sectionTitle: string, finding: Finding) {
    let section = this.sections.find((s) => s.title === sectionTitle);
    if (!section) {
      section = { title: sectionTitle, findings: [] };
      this.sections.push(section);
    }
    section.findings.push(finding);
  }

  private getStats() {
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    for (const section of this.sections) {
      for (const finding of section.findings) {
        if (finding.type === 'pass') passed++;
        else if (finding.type === 'fail') failed++;
        else if (finding.type === 'warning') warnings++;
      }
    }

    return { passed, failed, warnings, total: passed + failed + warnings };
  }

  generateMarkdown(): string {
    const stats = this.getStats();
    const timestamp = new Date().toISOString();

    let markdown = `# Mobile Visual & UX Audit Report\n\n`;
    markdown += `**Generated:** ${timestamp}\n`;
    markdown += `**Viewport:** 375px × 667px (iPhone SE/8 Portrait)\n\n`;

    // Executive Summary
    markdown += `## Executive Summary\n\n`;
    markdown += `| Metric | Count |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| ✅ Passed | ${stats.passed} |\n`;
    markdown += `| ❌ Failed | ${stats.failed} |\n`;
    markdown += `| ⚠️ Warnings | ${stats.warnings} |\n`;
    markdown += `| **Total Checks** | **${stats.total}** |\n\n`;

    const passRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0;
    markdown += `**Pass Rate:** ${passRate}%\n\n`;

    // Sections
    for (const section of this.sections) {
      markdown += `## ${section.title}\n\n`;

      if (section.findings.length === 0) {
        markdown += `*No findings in this section.*\n\n`;
        continue;
      }

      for (const finding of section.findings) {
        const icon = finding.type === 'pass' ? '✅' : finding.type === 'fail' ? '❌' : '⚠️';
        markdown += `### ${icon} ${finding.category}\n\n`;
        markdown += `${finding.description}\n\n`;

        if (finding.details) {
          markdown += `**Details:** ${finding.details}\n\n`;
        }

        if (finding.measurements) {
          markdown += `**Measurements:**\n`;
          for (const [key, value] of Object.entries(finding.measurements)) {
            markdown += `- ${key}: ${value}\n`;
          }
          markdown += `\n`;
        }

        if (finding.screenshot) {
          const relativePath = path.relative(
            path.dirname(this.reportPath),
            finding.screenshot
          );
          markdown += `![${finding.category}](${relativePath})\n\n`;
        }

        markdown += `---\n\n`;
      }
    }

    // Recommendations
    markdown += `## Recommendations\n\n`;

    const criticalIssues = this.sections.flatMap((s) =>
      s.findings.filter((f) => f.type === 'fail')
    );

    if (criticalIssues.length > 0) {
      markdown += `### Critical Issues (${criticalIssues.length})\n\n`;
      criticalIssues.forEach((issue, index) => {
        markdown += `${index + 1}. **${issue.category}**: ${issue.description}\n`;
      });
      markdown += `\n`;
    }

    const warningIssues = this.sections.flatMap((s) =>
      s.findings.filter((f) => f.type === 'warning')
    );

    if (warningIssues.length > 0) {
      markdown += `### Improvements (${warningIssues.length})\n\n`;
      warningIssues.forEach((issue, index) => {
        markdown += `${index + 1}. **${issue.category}**: ${issue.description}\n`;
      });
      markdown += `\n`;
    }

    if (criticalIssues.length === 0 && warningIssues.length === 0) {
      markdown += `🎉 **No issues found!** The mobile experience meets all tested criteria.\n\n`;
    }

    return markdown;
  }

  save(): string {
    const markdown = this.generateMarkdown();
    fs.writeFileSync(this.reportPath, markdown, 'utf-8');
    return this.reportPath;
  }
}
