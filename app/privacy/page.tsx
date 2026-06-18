export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: "760px",
        margin: "40px auto",
        padding: "0 20px",
        fontFamily: "Arial, sans-serif",
        lineHeight: 1.6,
      }}
    >
      <h1>Privacy Policy</h1>

      <p>
        This application is an internal tool used by the owner and authorized
        team of the connected Instagram professional account to receive
        Instagram messaging webhook events.
      </p>

      <h2>Data We Receive</h2>
      <p>
        The app may receive message event data from Instagram, including message
        IDs, sender IDs, recipient IDs, timestamps, message text, and webhook
        metadata.
      </p>

      <h2>How We Use Data</h2>
      <p>
        Data is used only to organize, classify, and prioritize Instagram
        conversations so the account owner or authorized team can respond
        manually.
      </p>

      <h2>What We Do Not Do</h2>
      <p>
        The app does not sell user data, share user data with third parties,
        send automated marketing messages, scrape Instagram, or use the data for
        unrelated purposes.
      </p>

      <h2>Data Retention</h2>
      <p>
        Data may be stored only as needed for internal inbox management,
        debugging, and operational follow-up.
      </p>

      <h2>Data Deletion</h2>
      <p>
        Users may request deletion of their message data by contacting the
        account owner at the email below.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy questions or data deletion requests, contact:
        apatront@gmail.com
      </p>
    </main>
  );
}