import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend çalışıyor!' });
});

app.listen(PORT, () => {
  console.log(`✅ Test server çalışıyor: http://localhost:${PORT}`);
});





