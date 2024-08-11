

app.get('/certificates/:id/verify', async (req, res) => {
    try {
      const { id } = req.params;
  
      // Find the certificate by ID
      const certificate = await Form.findOne({ certificateId: id });
  
      if (!certificate) {
        return res.status(404).json({ message: 'Certificate not found' });
      }
  
      // Return the certificate details along with verification status
      res.json({
        certificateId: certificate.certificateId,
        name: certificate.name,
        course: certificate.course,
        date: certificate.date,
        verified: !!certificate.certificateId // Assuming `certificateId` presence means verified
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  });
  