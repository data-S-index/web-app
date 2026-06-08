<script setup lang="ts">
useSeoMeta({
  title: "Terms of Use | Scholar Data",
  description:
    "Terms of Use governing access to and use of the Scholar Data platform.",
});
</script>

<template>
  <UContainer class="py-12">
    <div class="mx-auto max-w-3xl">
      <div class="mb-10 text-center">
        <h1 class="mb-4 text-3xl font-bold">Terms of Use</h1>

        <p class="text-muted text-base">
          These Terms of Use govern your access to and use of Scholar Data (the
          "Platform") and related services. By accessing or using the Platform,
          you agree to be bound by these Terms. If you do not agree to these
          Terms, you must not use the Platform.
        </p>
      </div>

      <UAlert
        color="info"
        variant="soft"
        class="mb-10"
        icon="i-heroicons-information-circle"
        title="About the Platform"
        description="Scholar Data is a platform for measuring, discovering, and showcasing the impact of research datasets. The Platform aggregates metadata and impact signals from trusted external sources, including DataCite and EMDB. It does not host dataset files directly. The Platform is designed to support responsible data sharing in accordance with FAIR (Findable, Accessible, Interoperable, Reusable) data principles."
      />

      <div class="space-y-10">
        <section>
          <h2 class="mb-4 text-xl font-semibold">1. Definitions</h2>

          <p class="text-muted mb-3 text-sm">
            For the purposes of these Terms:
          </p>

          <ul class="text-muted space-y-2 text-sm">
            <li>
              <span class="font-medium text-gray-900 dark:text-gray-100"
                >"Scholar Data"</span
              >
              or
              <span class="font-medium text-gray-900 dark:text-gray-100"
                >"Platform"</span
              >
              means the open platform for discovering, indexing, and measuring
              the impact of research datasets, operated by the Scholar Data
              Team.
            </li>

            <li>
              <span class="font-medium text-gray-900 dark:text-gray-100"
                >"Services"</span
              >
              means all functionality provided through the Platform, including
              dataset discovery, researcher profiles, S-index calculation, FAIR
              score evaluation, and related tools.
            </li>

            <li>
              <span class="font-medium text-gray-900 dark:text-gray-100"
                >"User"</span
              >
              or
              <span class="font-medium text-gray-900 dark:text-gray-100"
                >"you"</span
              >
              means any individual or entity that accesses or uses the Platform.
            </li>

            <li>
              <span class="font-medium text-gray-900 dark:text-gray-100"
                >"Dataset Record"</span
              >
              means a dataset entry in the Platform catalog, consisting of
              metadata and impact signals aggregated from external repositories
              and scholarly infrastructure.
            </li>

            <li>
              <span class="font-medium text-gray-900 dark:text-gray-100"
                >"Contributor"</span
              >
              means a User who creates a profile or claims datasets on the
              Platform.
            </li>
          </ul>
        </section>

        <USeparator />

        <section>
          <h2 class="mb-4 text-xl font-semibold">
            2. Eligibility and Accounts
          </h2>

          <p class="text-muted mb-4 text-sm">
            By using the Platform, you represent and warrant that you are
            legally permitted to do so under applicable law and any
            institutional policies that apply to you.
          </p>

          <p class="text-muted mb-3 text-sm">
            Certain features of the Platform require you to create an account.
            You agree to:
          </p>

          <ul class="text-muted list-disc space-y-1 pl-6 text-sm">
            <li>Provide accurate and up-to-date registration information;</li>

            <li>Maintain the confidentiality of your login credentials; and</li>

            <li>
              Be responsible for all activities that occur under your account.
            </li>
          </ul>
        </section>

        <USeparator />

        <section>
          <h2 class="mb-4 text-xl font-semibold">3. Nature of the Service</h2>

          <p class="text-muted mb-4 text-sm">
            Scholar Data is designed to make research datasets more findable,
            impactful, and properly credited. The Platform:
          </p>

          <ul class="text-muted list-disc space-y-2 pl-6 text-sm">
            <li>
              Indexes and tracks over 70 million datasets sourced from
              repositories including DataCite and EMDB;
            </li>

            <li>
              Computes the S-index, a metric that measures a researcher's data
              sharing impact across their dataset portfolio;
            </li>

            <li>
              Calculates Dataset Index (D-index) scores and FAIR scores for
              individual datasets using F-UJI and other tools;
            </li>

            <li>
              Tracks dataset citations from OpenAlex, Make Data Count, and
              DataCite, as well as mentions in code, patents, and policies;
            </li>

            <li>
              Enables researchers to create profiles, claim their datasets, and
              share their data sharing impact publicly; and
            </li>

            <li>
              Provides integration tools for repository maintainers to embed
              impact scores directly in their platforms.
            </li>
          </ul>

          <p class="text-muted mt-4 text-sm">
            The Platform is under active development. Features may change, be
            added, or be removed without prior notice.
          </p>
        </section>

        <USeparator />

        <section>
          <h2 class="mb-4 text-xl font-semibold">
            4. Dataset Records and Access
          </h2>

          <h3 class="mb-2 text-base font-medium">4.1 Public Records</h3>

          <p class="text-muted mb-4 text-sm">
            All dataset records on the Platform are publicly discoverable. Each
            record includes metadata and impact signals aggregated from external
            repositories. Access to and reuse of dataset files is subject to the
            license specified by the original data repository. Scholar Data does
            not control the licensing terms for individual datasets.
          </p>

          <h3 class="mb-2 text-base font-medium">
            4.2 Attribution and Citation
          </h3>

          <p class="text-muted text-sm">
            You agree to follow any citation or attribution instructions
            associated with a dataset record, including citing DOIs or other
            identifiers provided on the dataset record page.
          </p>
        </section>

        <USeparator />

        <section>
          <h2 class="mb-4 text-xl font-semibold">
            5. Contributor Responsibilities
          </h2>

          <p class="text-muted mb-3 text-sm">
            If you create a profile or claim datasets on the Platform, you agree
            that:
          </p>

          <ul class="text-muted list-disc space-y-2 pl-6 text-sm">
            <li>
              The information you provide about yourself and your datasets is
              accurate and complete;
            </li>

            <li>
              You have a reasonable basis for claiming datasets as yours (e.g.,
              you are a named author or creator);
            </li>

            <li>
              You will not misrepresent your identity, affiliation, or
              contributions; and
            </li>

            <li>
              You understand that your profile and claimed datasets will be
              publicly visible on the Platform.
            </li>
          </ul>
        </section>

        <USeparator />

        <section>
          <h2 class="mb-4 text-xl font-semibold">6. Acceptable Use</h2>

          <p class="text-muted mb-3 text-sm">
            You agree not to use the Platform or Services to:
          </p>

          <ul class="text-muted list-disc space-y-2 pl-6 text-sm">
            <li>
              Violate any applicable laws, regulations, or institutional
              policies;
            </li>

            <li>
              Misrepresent your identity, affiliation, or the origin of
              submitted content;
            </li>

            <li>
              Attempt to gain unauthorized access to the Platform or other
              users' accounts;
            </li>

            <li>
              Interfere with or disrupt the normal operation of the Platform,
              including through excessive automated requests or scraping beyond
              what is reasonably necessary for research purposes;
            </li>

            <li>
              Upload or distribute malware, malicious code, or content that
              could harm systems or data; or
            </li>

            <li>
              Use the Platform in any way that could harm other users,
              contributors, or the scientific community.
            </li>
          </ul>
        </section>

        <USeparator />

        <section>
          <h2 class="mb-4 text-xl font-semibold">7. Intellectual Property</h2>

          <h3 class="mb-2 text-base font-medium">7.1 Platform and Software</h3>

          <p class="text-muted mb-4 text-sm">
            The Scholar Data software, design, and infrastructure are made
            available as open source. The source code is available at
            <a
              href="https://github.com/data-S-index/web-app"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary font-medium hover:underline"
              >data-S-index/web-app</a
            >
            and may be used subject to the terms of the applicable license(s).
          </p>

          <h3 class="mb-2 text-base font-medium">
            7.2 Dataset Content and Metadata
          </h3>

          <p class="text-muted text-sm">
            Ownership and licensing of datasets and associated metadata remain
            with their original authors and/or institutions. Each dataset record
            links to the original repository where licensing terms are
            specified. You agree to comply with the applicable license when
            accessing or reusing dataset content.
          </p>
        </section>

        <USeparator />

        <section>
          <h2 class="mb-4 text-xl font-semibold">
            8. Privacy and Data Protection
          </h2>

          <p class="text-muted text-sm">
            Your use of the Platform is also governed by our Privacy Policy,
            which describes how we collect, use, and protect personal
            information. Please review the Privacy Policy at
            <NuxtLink
              to="/privacy"
              class="text-primary font-medium hover:underline"
              >/privacy</NuxtLink
            >.
          </p>
        </section>

        <USeparator />

        <section>
          <h2 class="mb-4 text-xl font-semibold">
            9. Service Availability and Changes
          </h2>

          <p class="text-muted text-sm">
            We aim to provide a reliable service, but the Platform may
            experience downtime, maintenance windows, or technical issues. We
            may modify, suspend, or discontinue any part of the Services at any
            time, with or without notice, including in response to security
            concerns, technical issues, or changes in funding or project scope.
          </p>
        </section>

        <USeparator />

        <section>
          <h2 class="mb-4 text-xl font-semibold">10. Disclaimers</h2>

          <ul class="text-muted list-disc space-y-2 pl-6 text-sm">
            <li>
              The Platform and all dataset records are provided "as is" and "as
              available" without warranties of any kind, whether express or
              implied.
            </li>

            <li>
              We do not guarantee the completeness, accuracy, or suitability of
              any dataset record, impact score, or metadata for a particular
              purpose.
            </li>

            <li>
              Impact scores including the S-index, D-index, and FAIR scores are
              computed automatically and may contain errors or reflect
              incomplete data from external sources.
            </li>

            <li>
              To the fullest extent permitted by law, we disclaim all
              warranties, including implied warranties of merchantability,
              fitness for a particular purpose, and non-infringement.
            </li>
          </ul>
        </section>

        <USeparator />

        <section>
          <h2 class="mb-4 text-xl font-semibold">
            11. Limitation of Liability
          </h2>

          <p class="text-muted text-sm">
            To the fullest extent permitted by law, in no event shall the
            Scholar Data Team or their respective institutions, funders,
            employees, or affiliates be liable for any indirect, incidental,
            consequential, special, exemplary, or punitive damages, or any loss
            of data, profits, or opportunities, arising out of or in connection
            with your use of or inability to use the Platform or any dataset
            record.
          </p>
        </section>

        <USeparator />

        <section>
          <h2 class="mb-4 text-xl font-semibold">12. Indemnification</h2>

          <p class="text-muted text-sm">
            You agree to indemnify, defend, and hold harmless the Scholar Data
            Team and their collaborators and institutions from and against any
            claims, liabilities, damages, losses, and expenses (including
            reasonable attorneys' fees) arising out of or in any way connected
            with your use of the Platform, your violation of these Terms, or
            your violation of any applicable law or third-party rights.
          </p>
        </section>

        <USeparator />

        <section>
          <h2 class="mb-4 text-xl font-semibold">13. Third-Party Services</h2>

          <p class="text-muted text-sm">
            The Platform integrates with and links to third-party services and
            data sources, including DataCite, EMDB, OpenAlex, Make Data Count,
            F-UJI, Software Heritage, and Hugging Face. We do not control and
            are not responsible for the content, policies, or practices of any
            third-party services. Your use of such services is subject to their
            own terms and policies.
          </p>
        </section>

        <USeparator />

        <section>
          <h2 class="mb-4 text-xl font-semibold">14. Changes to These Terms</h2>

          <p class="text-muted text-sm">
            We may update these Terms from time to time. When we do so, we will
            update the "last updated" date below. Your continued use of the
            Platform after changes take effect constitutes your acceptance of
            the revised Terms.
          </p>
        </section>

        <USeparator />

        <section>
          <h2 class="mb-4 text-xl font-semibold">15. Contact</h2>

          <p class="text-muted text-sm">
            If you have questions about these Terms, please contact us through
            our
            <NuxtLink
              to="https://tally.so/r/jaJR2Y"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary font-medium hover:underline"
              >contact form</NuxtLink
            >. You may also report technical issues or feature requests via our
            GitHub repository at
            <a
              href="https://github.com/data-S-index/web-app"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary font-medium hover:underline"
              >data-S-index/web-app</a
            >.
          </p>
        </section>

        <USeparator />

        <p class="text-muted text-center text-xs">Last updated: June 8, 2026</p>
      </div>
    </div>
  </UContainer>
</template>
